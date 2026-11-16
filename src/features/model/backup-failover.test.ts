import assert from "node:assert/strict";
import test from "node:test";
import { executeWithFailover } from "./failover-runner.ts";
import type { ModelAdapter, ModelRequest } from "./model-adapter.ts";
import type {
  ModelStreamOpen,
  StreamingModelAdapter,
} from "./stream-adapter.ts";
import type { ChatStreamEvent } from "./stream-events.ts";
import { streamWithFailover } from "./stream-with-failover.ts";

const RATE_LIMITED = "429: rate_limited reset=120";

const request: ModelRequest = {
  language: "en",
  messages: [{ role: "user", text: "hi" }],
  modelId: "main",
  backupModelIds: ["backup-1", "backup-2"],
};

/** One adapter whose answer depends on the model id of each call. */
function byModel(
  answers: Record<string, ModelStreamOpen>,
  seen: string[],
): StreamingModelAdapter {
  return {
    provider: "local",
    model: "configured",
    generateReply: async () => {
      throw new Error("not used");
    },
    streamReply: async (req) => {
      seen.push(req.modelId ?? "none");
      return answers[req.modelId ?? "none"];
    },
  };
}

async function* text(value: string) {
  yield { type: "delta" as const, text: value };
}

const limited: ModelStreamOpen = {
  ok: false,
  code: "provider_rejected",
  provider: "local",
  detail: RATE_LIMITED,
};
const answers = (value: string): ModelStreamOpen => ({
  ok: true,
  provider: "local",
  chunks: text(value),
});

async function run(adapter: StreamingModelAdapter, req = request) {
  const events: ChatStreamEvent[] = [];
  for await (const event of streamWithFailover({
    request: req,
    primary: adapter,
    signal: new AbortController().signal,
  })) {
    events.push(event);
  }
  return events;
}

test("a usage limit moves to the first backup once, with the reset time", async () => {
  const seen: string[] = [];
  const events = await run(
    byModel({ main: limited, "backup-1": answers("ok") }, seen),
  );
  assert.deepEqual(seen, ["main", "backup-1"]);
  assert.deepEqual(events.at(-1), {
    type: "done",
    provider: "local",
    model: "configured",
    failover: {
      fromModel: "main",
      toModel: "backup-1",
      reason: "429: rate_limited",
      resetSeconds: 120,
    },
  });
});

test("backups are tried in order and a failed one is not retried", async () => {
  const seen: string[] = [];
  const events = await run(
    byModel(
      { main: limited, "backup-1": limited, "backup-2": answers("ok") },
      seen,
    ),
  );
  assert.deepEqual(seen, ["main", "backup-1", "backup-2"]);
  const done = events.at(-1);
  assert.equal(done?.type === "done" && done.failover?.toModel, "backup-2");
});

test("when every model is limited the error carries the reset and stops", async () => {
  const seen: string[] = [];
  const events = await run(
    byModel({ main: limited, "backup-1": limited, "backup-2": limited }, seen),
  );
  assert.deepEqual(seen, ["main", "backup-1", "backup-2"]);
  assert.deepEqual(events, [
    {
      type: "error",
      code: "rate_limit",
      provider: "local",
      status: 429,
      resetSeconds: 120,
    },
  ]);
});

test("without backups nothing changes for a limited primary", async () => {
  const seen: string[] = [];
  const { backupModelIds: _backups, ...plain } = request;
  const events = await run(byModel({ main: limited }, seen), plain);
  assert.deepEqual(seen, ["main"]);
  assert.equal(events[0].type, "error");
});

test("the non-stream runner also uses backups before the fallback", async () => {
  const seen: string[] = [];
  const primary: ModelAdapter = {
    provider: "local",
    model: "configured",
    async generateReply(req) {
      seen.push(req.modelId ?? "none");
      return req.modelId === "backup-1"
        ? { ok: true, provider: "local", text: "from backup" }
        : {
            ok: false,
            code: "provider_rejected",
            provider: "local",
            detail: RATE_LIMITED,
          };
    },
  };
  const result = await executeWithFailover({
    request,
    primaryAdapter: primary,
  });
  assert.deepEqual(seen, ["main", "backup-1"]);
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.failover, {
    fromModel: "main",
    toModel: "backup-1",
    reason: "429: rate_limited",
    resetSeconds: 120,
  });
});
