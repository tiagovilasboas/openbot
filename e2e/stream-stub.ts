import http from "node:http";
import type { AddressInfo } from "node:net";
import type { BrowserContext } from "@playwright/test";

/** One step of a scripted /api/chat/stream answer, in the order it is sent. */
export type StreamStep =
  | { delta: string }
  | { error: string }
  | { done: true }
  /** Holds the stream here until the test calls `release(name)`. */
  | { gate: string };

export interface StreamStub {
  /** Scripts for /api/chat/stream calls, in order. With none left the route
   * answers 503, so the app falls back to the plain /api/chat stub. */
  queue: (...scripts: StreamStep[][]) => void;
  /** Lets a stream pass its `{ gate }` step. */
  release: (gate: string) => void;
  /** Bodies of the /api/chat/stream calls received so far. */
  requests: () => unknown[];
  /** Streams the client left before the script ended. */
  aborted: () => number;
  close: () => Promise<void>;
}

function line(event: object): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Stubs /api/chat/stream on a context. Playwright can only fulfill a whole
 * body, so a scripted call is continued to a tiny local server that writes the
 * events one at a time and can wait on gates: that is what makes "text appears
 * while the reply is still coming" testable.
 */
export async function stubStream(context: BrowserContext): Promise<StreamStub> {
  const scripts: StreamStep[][] = [];
  const running = new Map<string, StreamStep[]>();
  const received: unknown[] = [];
  const gates = new Map<string, { open: boolean; wake: () => void }>();
  let aborted = 0;
  let nextId = 1;

  const gate = (name: string) => {
    let entry = gates.get(name);
    if (!entry) {
      entry = { open: false, wake: () => undefined };
      gates.set(name, entry);
    }
    return entry;
  };
  const waitFor = (name: string, ended: () => boolean) =>
    new Promise<void>((resolve) => {
      const entry = gate(name);
      const check = () => (entry.open || ended() ? resolve() : undefined);
      entry.wake = check;
      check();
    });

  const server = http.createServer((req, res) => {
    req.resume();
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "*");
    const script = running.get((req.url ?? "").slice(1));
    if (req.method === "OPTIONS" || !script) {
      res.writeHead(req.method === "OPTIONS" ? 204 : 404).end();
      return;
    }
    res.writeHead(200, {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    });
    res.flushHeaders();
    let gone = false;
    res.on("close", () => {
      if (res.writableEnded) return;
      gone = true;
      aborted += 1;
      gates.forEach((entry) => entry.wake());
    });
    void (async () => {
      let started = false;
      for (const step of script) {
        if (gone) return;
        if ("gate" in step) await waitFor(step.gate, () => gone);
        else if ("delta" in step) {
          if (!started) res.write(line({ type: "start", provider: "stub" }));
          started = true;
          res.write(line({ type: "delta", text: step.delta }));
        } else if ("error" in step) {
          res.write(
            line({ type: "error", code: step.error, provider: "stub" }),
          );
        } else res.write(line({ type: "done", provider: "stub" }));
      }
      res.end();
    })();
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const { port } = server.address() as AddressInfo;

  await context.route("**/api/chat/stream", async (route) => {
    received.push(route.request().postDataJSON());
    const script = scripts.shift();
    if (!script) {
      await route.fulfill({
        status: 503,
        json: { error: "no_provider_configured" },
      });
      return;
    }
    const id = String(nextId++);
    running.set(id, script);
    await route.continue({ url: `http://127.0.0.1:${port}/${id}` });
  });

  return {
    queue: (...next) => void scripts.push(...next),
    release(name) {
      const entry = gate(name);
      entry.open = true;
      entry.wake();
    },
    requests: () => received,
    aborted: () => aborted,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
