const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

if (!apiKey) {
  console.error("OPENAI_API_KEY is required for the opt-in live smoke test.");
  process.exit(1);
}

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model,
    input: "Return a supported Vietnamese answer for the approved fact: hạn nộp là 17:00.",
    text: {
      format: {
        type: "json_schema",
        name: "grounded_answer_smoke",
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

if (!response.ok) {
  throw new Error(`OpenAI smoke test failed with HTTP ${response.status}: ${await response.text()}`);
}

const payload = await response.json();
const outputText = payload.output
  ?.flatMap((item) => item.content ?? [])
  .find((content) => content.type === "output_text")?.text;
const result = outputText ? JSON.parse(outputText) : null;

if (
  result?.supported !== true ||
  typeof result.answer !== "string" ||
  typeof result.evidence !== "string"
) {
  throw new Error("OpenAI smoke test returned an invalid structured payload.");
}

console.log(`OpenAI smoke test passed with ${model}.`);
