export const unsupportedAnswer = {
  supported: false,
  answer: "Hỏi người tổ chức",
  evidence: ""
} as const;

export const normalizeGroundedAnswer = (value: unknown) => {
  if (!value || typeof value !== "object") return { ...unsupportedAnswer };
  const candidate = value as Record<string, unknown>;
  if (
    candidate.supported !== true ||
    typeof candidate.answer !== "string" ||
    typeof candidate.evidence !== "string" ||
    !candidate.evidence.trim()
  ) {
    return { ...unsupportedAnswer };
  }
  return {
    supported: true,
    answer: candidate.answer,
    evidence: candidate.evidence
  };
};
