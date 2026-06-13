import { corsHeaders, json } from "../_shared/cors.ts";
import { hashToken } from "../_shared/crypto.ts";
import { normalizeGroundedAnswer, unsupportedAnswer } from "../_shared/grounding.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { adminClient } from "../_shared/supabase.ts";

const fallback = unsupportedAnswer.answer;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  const admin = adminClient();
  try {
    const body = await request.json();
    const token = String(body.token ?? "");
    const announcementId = String(body.announcement_id ?? "");
    const question = String(body.question ?? "").trim();
    if (!token || !announcementId || question.length < 2 || question.length > 500) {
      return json({ error: "invalid_request" }, 400);
    }

    const tokenHash = await hashToken(token);
    const { data: invite } = await admin
      .from("member_invites")
      .select("member_id,expires_at,revoked_at,members(group_id)")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!invite || invite.revoked_at || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
      return json({ error: "invalid_token" }, 401);
    }
    const member = Array.isArray(invite.members) ? invite.members[0] : invite.members;
    const { data: announcement } = await admin
      .from("announcements")
      .select("id,group_id,title,summary,source_text,approved_faq,status")
      .eq("id", announcementId)
      .eq("group_id", member.group_id)
      .eq("status", "published")
      .maybeSingle();
    if (!announcement) return json({ error: "announcement_not_found" }, 404);
    await enforceRateLimit(admin, `faq:${invite.member_id}`, 20, 10);

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5.4-mini";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions:
          `Chỉ trả lời nếu câu trả lời được hỗ trợ trực tiếp bởi nội dung đã duyệt. Nếu không, supported=false, answer="${fallback}", evidence="". Không suy đoán.`,
        input: JSON.stringify({
          question,
          announcement: {
            title: announcement.title,
            summary: announcement.summary,
            source_text: announcement.source_text,
            approved_faq: announcement.approved_faq
          }
        }),
        text: {
          format: {
            type: "json_schema",
            name: "grounded_answer",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["supported", "answer", "evidence"],
              properties: {
                supported: { type: "boolean" },
                answer: { type: "string" },
                evidence: { type: "string" }
              }
            }
          }
        }
      })
    });
    if (!response.ok) throw new Error(`openai_${response.status}`);
    const payload = await response.json();
    const outputText = payload.output?.flatMap((item: { content?: Array<{ type: string; text?: string }> }) => item.content ?? [])
      .find((content: { type: string; text?: string }) => content.type === "output_text")?.text;
    const result = normalizeGroundedAnswer(outputText ? JSON.parse(outputText) : null);
    await admin.from("api_usage_log").insert({
      group_id: announcement.group_id,
      announcement_id: announcement.id,
      operation: "answer_member_question",
      model,
      duration_ms: Date.now() - started,
      input_tokens: payload.usage?.input_tokens ?? null,
      output_tokens: payload.usage?.output_tokens ?? null,
      outcome: result.supported ? "supported" : "fallback"
    });
    return json(result);
  } catch (error) {
    console.error(error);
    return json({ ...unsupportedAnswer, error: "answer_failed" }, 200);
  }
});
