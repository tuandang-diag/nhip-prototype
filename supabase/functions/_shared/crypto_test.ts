import { createToken, hashToken } from "./crypto.ts";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("invite tokens are random and only hashes need persistence", async () => {
  const first = createToken();
  const second = createToken();

  assert(first !== second, "tokens must differ");
  assert(first.length === 43, "token must contain 256 bits encoded as base64url");
  assert((await hashToken(first)).length === 64, "SHA-256 hash must be hexadecimal");
  assert(await hashToken(first) !== await hashToken(second), "token hashes must differ");
});
