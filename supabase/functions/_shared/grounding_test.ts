import { normalizeGroundedAnswer, unsupportedAnswer } from "./grounding.ts";

const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
};

Deno.test("unsupported model answers always use the deterministic fallback", () => {
  assertEquals(
    normalizeGroundedAnswer({ supported: false, answer: "Tự suy đoán", evidence: "" }),
    unsupportedAnswer
  );
});

Deno.test("supported model answers require evidence", () => {
  assertEquals(
    normalizeGroundedAnswer({ supported: true, answer: "Có", evidence: "" }),
    unsupportedAnswer
  );
});
