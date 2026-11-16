import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { challengeFor, createPkce, createState } from "./pkce.ts";

const BASE64URL = /^[A-Za-z0-9_-]+$/;

test("the S256 challenge is unpadded base64url of sha256", async () => {
  for (let i = 0; i < 50; i += 1) {
    const verifier = `fixed-verifier-${i}-0123456789abcdefghijklmnopqrstuvwxyz`;
    const expected = createHash("sha256").update(verifier).digest("base64url");
    assert.equal(await challengeFor(verifier), expected);
  }
});

test("a verifier is base64url, 43 to 128 chars, and its challenge is sha256", async () => {
  const { verifier, challenge } = await createPkce();
  assert.ok(verifier.length >= 43 && verifier.length <= 128);
  assert.match(verifier, BASE64URL);
  const expected = createHash("sha256").update(verifier).digest("base64url");
  assert.equal(challenge, expected);
});

test("each Connect gets a fresh verifier and state", async () => {
  const [first, second] = [await createPkce(), await createPkce()];
  assert.notEqual(first.verifier, second.verifier);
  assert.notEqual(createState(), createState());
  assert.match(createState(), BASE64URL);
});
