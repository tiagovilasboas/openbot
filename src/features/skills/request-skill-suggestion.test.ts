import assert from "node:assert/strict";
import test from "node:test";
import { requestSkillSuggestion } from "./request-skill-suggestion.ts";

const messages = ["a", "b", "c", "d", "e"];
const skill = {
  name: "Code review",
  command: "/not-trusted",
  description: "d",
  instructions: "Read the diff.",
};

function respond(status: number, body: unknown): typeof fetch {
  return (async () => Response.json(body, { status })) as typeof fetch;
}

test("a 200 with a skill is a draft whose command is re-derived", async () => {
  const outcome = await requestSkillSuggestion(
    "en",
    messages,
    respond(200, { skill }),
  );
  assert.equal(outcome.kind, "draft");
  if (outcome.kind === "draft") {
    assert.equal(outcome.draft.command, "/code-review");
  }
});

test("a 200 whose skill has the wrong shape is invalid, not a draft", async () => {
  for (const body of [{}, { skill: "x" }, { skill: { name: "n" } }]) {
    const outcome = await requestSkillSuggestion(
      "en",
      messages,
      respond(200, body),
    );
    assert.equal(outcome.kind, "invalid_suggestion");
  }
});

test("typed server errors map to typed outcomes", async () => {
  const cases: [number, unknown, string][] = [
    [422, { error: "not_enough_history" }, "not_enough_history"],
    [502, { error: "invalid_suggestion" }, "invalid_suggestion"],
    [503, { error: "no_provider_configured" }, "unavailable"],
  ];
  for (const [status, body, kind] of cases) {
    const outcome = await requestSkillSuggestion(
      "en",
      messages,
      respond(status, body),
    );
    assert.equal(outcome.kind, kind);
  }
});

test("model failures reuse the chat's failure kinds", async () => {
  const auth = await requestSkillSuggestion(
    "en",
    messages,
    respond(502, { error: "provider_rejected", detail: "401: nope" }),
  );
  assert.deepEqual(auth, {
    kind: "error",
    failure: { kind: "auth", status: 401 },
  });
  const blocked = await requestSkillSuggestion(
    "en",
    messages,
    respond(400, { error: "blocked_base_url" }),
  );
  assert.deepEqual(blocked, {
    kind: "error",
    failure: { kind: "blocked_url" },
  });
});

test("the request goes to the suggest route with the guard header and no extras", async () => {
  let url = "";
  let init: RequestInit = {};
  const fetchImpl = (async (u: string, i: RequestInit) => {
    url = u;
    init = i;
    return Response.json({ skill });
  }) as unknown as typeof fetch;
  await requestSkillSuggestion("pt", messages, fetchImpl, { modelId: "v/m" });
  assert.equal(url, "/api/skills/suggest");
  assert.equal(new Headers(init.headers).get("x-openbot-client"), "1");
  assert.deepEqual(JSON.parse(String(init.body)), {
    language: "pt",
    messages,
    modelId: "v/m",
  });
});

test("cancelling, timing out and being offline are told apart", async () => {
  const hang = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("abort")));
    })) as unknown as typeof fetch;

  const user = new AbortController();
  const pending = requestSkillSuggestion("en", messages, hang, {
    signal: user.signal,
  });
  user.abort();
  assert.deepEqual(await pending, {
    kind: "error",
    failure: { kind: "cancelled" },
  });

  const late = await requestSkillSuggestion("en", messages, hang, {
    timeoutMs: 10,
  });
  assert.deepEqual(late, { kind: "error", failure: { kind: "timeout" } });

  const broken = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  const offline = await requestSkillSuggestion("en", messages, broken, {
    isOnline: () => false,
  });
  assert.deepEqual(offline, { kind: "error", failure: { kind: "offline" } });
});
