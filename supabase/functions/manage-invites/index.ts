import { corsHeaders, json } from "../_shared/cors.ts";
import { createToken, hashToken } from "../_shared/crypto.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { adminClient, userClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  try {
    const body = await request.json();
    const memberIds = Array.isArray(body.member_ids) ? body.member_ids : [];
    const operation = String(body.operation ?? "generate");
    const expiresAt = body.expires_at || null;
    if (!memberIds.length || memberIds.length > 500) return json({ error: "invalid_members" }, 400);
    if (!["generate", "revoke"].includes(operation)) {
      return json({ error: "invalid_operation" }, 400);
    }
    if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
      return json({ error: "invalid_expiry" }, 400);
    }
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      return json({ error: "expiry_must_be_future" }, 400);
    }

    const scoped = userClient(authorization);
    const { data: userData } = await scoped.auth.getUser();
    if (!userData.user) return json({ error: "unauthorized" }, 401);
    const { data: members, error } = await scoped
      .from("members")
      .select("id,name,student_id,group_id")
      .in("id", memberIds);
    if (error || !members || members.length !== memberIds.length) {
      return json({ error: "not_authorized" }, 403);
    }

    const admin = adminClient();
    await enforceRateLimit(admin, `invites:${userData.user.id}`, 10, 10);
    const revokedAt = new Date().toISOString();
    const groupIds = [...new Set(members.map((member) => member.group_id))];

    await admin
      .from("member_invites")
      .update({ revoked_at: revokedAt })
      .in("member_id", memberIds)
      .is("revoked_at", null);

    if (operation === "revoke") {
      await admin.from("activity_log").insert(
        groupIds.map((groupId) => ({
          group_id: groupId,
          actor_user_id: userData.user.id,
          event_type: "member_invites_revoked",
          metadata: { member_count: members.filter((member) => member.group_id === groupId).length }
        }))
      );
      return json({ ok: true });
    }

    const links = [];
    for (const member of members) {
      const token = createToken();
      const tokenHash = await hashToken(token);
      const { error: insertError } = await admin.from("member_invites").insert({
        member_id: member.id,
        token_hash: tokenHash,
        expires_at: expiresAt
      });
      if (insertError) throw insertError;
      links.push({
        member_id: member.id,
        name: member.name,
        student_id: member.student_id,
        token
      });
    }
    await admin.from("activity_log").insert(
      groupIds.map((groupId) => ({
        group_id: groupId,
        actor_user_id: userData.user.id,
        event_type: "member_invites_generated",
        metadata: { member_count: members.filter((member) => member.group_id === groupId).length }
      }))
    );
    return json({ links });
  } catch (error) {
    console.error(error);
    return json({ error: "invite_generation_failed" }, 500);
  }
});
