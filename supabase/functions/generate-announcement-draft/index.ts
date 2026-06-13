import { corsHeaders, json } from "../_shared/cors.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { adminClient, userClient } from "../_shared/supabase.ts";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title", "summary", "deadline", "room", "action_label", "completion_type",
    "attachments", "faq", "evidence", "warnings", "validation_issues"
  ],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    deadline: { type: ["string", "null"], description: "ISO 8601 with +07:00 when known" },
    room: { type: "string" },
    action_label: { type: "string" },
    completion_type: { type: "string", enum: ["acknowledgement", "submission"] },
    attachments: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["name", "type", "url"],
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["pdf", "link"] },
          url: { type: "string" }
        }
      }
    },
    faq: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["question", "answer", "evidence"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          evidence: { type: "string" }
        }
      }
    },
    evidence: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["field", "quote"],
        properties: { field: { type: "string" }, quote: { type: "string" } }
      }
    },
    warnings: { type: "array", items: { type: "string" } },
    validation_issues: { type: "array", items: { type: "string" } }
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  let groupId: string | null = null;
  let announcementId: string | null = null;
  let model = Deno.env.get("OPENAI_MODEL") || "gpt-5.4-mini";
  const admin = adminClient();
  try {
    const body = await request.json();
    groupId = String(body.group_id ?? "");
    announcementId = body.announcement_id ? String(body.announcement_id) : null;
    const sourceText = String(body.source_text ?? "").trim();
    if (!groupId || sourceText.length < 10 || sourceText.length > 12000) {
      return json({ error: "invalid_request" }, 400);
    }

    const scoped = userClient(authorization);
    const { data: group, error } = await scoped.from("groups").select("id,name,code").eq("id", groupId).single();
    if (error || !group) return json({ error: "not_authorized" }, 403);
    const { data: userData } = await scoped.auth.getUser();
    await enforceRateLimit(admin, `draft:${userData.user?.id}`, 10, 10);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions:
          "Bạn trích xuất thông báo lớp học bằng tiếng Việt. Chỉ dùng thông tin trong nguồn. Không tự tạo chính sách. Nếu mơ hồ, để trường rỗng/null và thêm cảnh báo. Múi giờ mặc định Asia/Ho_Chi_Minh. FAQ chỉ được trả lời bằng bằng chứng nguyên văn.",
        input: `Nhóm: ${group.name} (${group.code})\nNgày hiện tại: ${new Date().toISOString()}\nThông báo:\n${sourceText}`,
        text: {
          format: {
            type: "json_schema",
            name: "announcement_draft",
            strict: true,
            schema
          }
        }
      })
    });
    if (!response.ok) throw new Error(`openai_${response.status}`);
    const payload = await response.json();
    const outputText = payload.output?.flatMap((item: { content?: Array<{ type: string; text?: string }> }) => item.content ?? [])
      .find((content: { type: string; text?: string }) => content.type === "output_text")?.text;
    if (!outputText) throw new Error("openai_empty");
    const draft = JSON.parse(outputText);
    await admin.from("api_usage_log").insert({
      group_id: groupId,
      announcement_id: announcementId,
      operation: "generate_announcement_draft",
      model,
      duration_ms: Date.now() - started,
      input_tokens: payload.usage?.input_tokens ?? null,
      output_tokens: payload.usage?.output_tokens ?? null,
      outcome: "success"
    });
    return json({ draft });
  } catch (error) {
    console.error(error);
    await admin.from("api_usage_log").insert({
      group_id: groupId,
      announcement_id: announcementId,
      operation: "generate_announcement_draft",
      model,
      duration_ms: Date.now() - started,
      outcome: error instanceof Error ? error.message : "failed"
    });
    return json({ error: error instanceof Error && error.message === "rate_limited" ? "rate_limited" : "generation_failed" }, 500);
  }
});
