import { corsHeaders, json } from "../_shared/cors.ts";
import { hashToken } from "../_shared/crypto.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { adminClient } from "../_shared/supabase.ts";

const fallback = "Hỏi người tổ chức";

const resolveAccess = async (token: string, announcementId: string) => {
  const admin = adminClient();
  const tokenHash = await hashToken(token);
  const { data: invite } = await admin
    .from("member_invites")
    .select("id,member_id,expires_at,revoked_at,members(id,name,student_id,team,group_id)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invite) return { error: "invalid_token" as const };
  if (invite.revoked_at) return { error: "revoked_token" as const };
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "expired_token" as const };
  }

  const member = Array.isArray(invite.members) ? invite.members[0] : invite.members;
  const { data: announcement } = await admin
    .from("announcements")
    .select("*")
    .eq("id", announcementId)
    .eq("group_id", member.group_id)
    .maybeSingle();
  if (!announcement) return { error: "invalid_announcement" as const };
  if (announcement.status !== "published") return { error: "unpublished_announcement" as const };

  await admin
    .from("member_invites")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", invite.id);
  return { admin, invite, member, announcement };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await request.json();
    const token = String(body.token ?? "");
    const announcementId = String(body.announcement_id ?? "");
    const operation = String(body.operation ?? "read");
    if (!token || !announcementId) return json({ error: "invalid_request" }, 400);

    const access = await resolveAccess(token, announcementId);
    if ("error" in access) return json({ error: access.error }, access.error === "invalid_token" ? 404 : 410);
    const { admin, member, announcement } = access;
    await enforceRateLimit(admin, `member:${member.id}`, 60, 10);

    if (operation === "read") {
      const { data: action } = await admin
        .from("member_actions")
        .select("*")
        .eq("announcement_id", announcement.id)
        .eq("member_id", member.id)
        .maybeSingle();
      if (!action) return json({ error: "action_not_found" }, 404);
      const now = new Date().toISOString();
      if (!action.opened_at) {
        await admin
          .from("member_actions")
          .update({ opened_at: now, updated_at: now })
          .eq("announcement_id", announcement.id)
          .eq("member_id", member.id);
        action.opened_at = now;
      }
      const { data: group } = await admin.from("groups").select("name,code").eq("id", member.group_id).single();
      const { data: organizer } = await admin
        .from("group_organizers")
        .select("user_id")
        .eq("group_id", member.group_id)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();
      const { data: organizerProfile } = organizer
        ? await admin.from("profiles").select("display_name").eq("id", organizer.user_id).maybeSingle()
        : { data: null };
      await admin.from("activity_log").insert({
        group_id: member.group_id,
        announcement_id: announcement.id,
        actor_member_id: member.id,
        event_type: "member_action_opened",
        metadata: {}
      });
      return json({
        member,
        action,
        announcement,
        group,
        organizer_name: organizerProfile?.display_name ?? "Người tổ chức"
      });
    }

    const { data: current } = await admin
      .from("member_actions")
      .select("*")
      .eq("announcement_id", announcement.id)
      .eq("member_id", member.id)
      .single();
    const deadlinePassed = announcement.deadline && new Date(announcement.deadline) < new Date();
    if (deadlinePassed && operation === "submit" && current.status !== "completed") {
      return json({ error: "deadline_passed" }, 409);
    }

    const now = new Date().toISOString();
    if (operation === "acknowledge") {
      if (current.status === "unopened") {
        await admin.from("member_actions").update({
          status: "acknowledged",
          opened_at: current.opened_at ?? now,
          acknowledged_at: now,
          updated_at: now
        }).eq("announcement_id", announcement.id).eq("member_id", member.id);
      }
    } else if (operation === "submit") {
      const submissionUrl = String(body.submission_url ?? "");
      try {
        new URL(submissionUrl);
      } catch {
        return json({ error: "invalid_url" }, 400);
      }
      await admin.from("member_actions").update({
        status: "completed",
        submission_url: submissionUrl,
        blocker: "",
        opened_at: current.opened_at ?? now,
        acknowledged_at: current.acknowledged_at ?? now,
        completed_at: now,
        updated_at: now
      }).eq("announcement_id", announcement.id).eq("member_id", member.id);
    } else if (operation === "block") {
      const blocker = String(body.blocker ?? "").trim();
      if (!blocker || blocker.length > 1000) return json({ error: "invalid_blocker" }, 400);
      await admin.from("member_actions").update({
        status: "blocked",
        blocker,
        completed_at: null,
        opened_at: current.opened_at ?? now,
        acknowledged_at: current.acknowledged_at ?? now,
        updated_at: now
      }).eq("announcement_id", announcement.id).eq("member_id", member.id);
    } else {
      return json({ error: "invalid_operation", fallback }, 400);
    }

    await admin.from("activity_log").insert({
      group_id: member.group_id,
      announcement_id: announcement.id,
      actor_member_id: member.id,
      event_type:
        operation === "submit"
          ? "member_submission_updated"
          : operation === "acknowledge"
            ? "member_acknowledged"
            : "member_blocker_updated",
      metadata: {}
    });
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error && error.message === "rate_limited" ? "rate_limited" : "member_action_failed" }, 500);
  }
});
