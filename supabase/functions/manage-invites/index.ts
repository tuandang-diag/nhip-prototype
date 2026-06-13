import { corsHeaders, json } from "../_shared/cors.ts";
import { createToken, hashToken } from "../_shared/crypto.ts";
import { adminClient, userClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  try {
    const body = await request.json();
    const memberIds = Array.isArray(body.member_ids) ? body.member_ids : [];
    const expiresAt = body.expires_at || null;
    if (!memberIds.length || memberIds.length > 500) return json({ error: "invalid_members" }, 400);

    const scoped = userClient(authorization);
    const { data: members, error } = await scoped
      .from("members")
      .select("id,name,student_id,group_id")
      .in("id", memberIds);
    if (error || !members || members.length !== memberIds.length) {
      return json({ error: "not_authorized" }, 403);
    }

    const admin = adminClient();
    const links = [];
    for (const member of members) {
      const token = createToken();
      const tokenHash = await hashToken(token);
      await admin
        .from("member_invites")
        .update({ revoked_at: new Date().toISOString() })
        .eq("member_id", member.id)
        .is("revoked_at", null);
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
    return json({ links });
  } catch (error) {
    console.error(error);
    return json({ error: "invite_generation_failed" }, 500);
  }
});
