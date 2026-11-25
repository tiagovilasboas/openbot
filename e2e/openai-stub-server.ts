import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

// A tiny OpenAI-compatible model for the e2e specs that need the server (not
// the browser) to call a model: routine runs, the automation route, the crew
// room. It never leaves the machine. Calls are kept per model name, so a spec
// that picks its own model name sees only its own calls and replies.

interface WireMessage {
  role: string;
  content: unknown;
}
interface RecordedCall {
  system: string;
  user: string;
}

const PORT = Number(process.env.OPENBOT_E2E_STUB_PORT) || 3900;
const calls = new Map<string, RecordedCall[]>();
const fixedReplies = new Map<string, string>();
// A tool call the model asks for first, once per request that offers tools.
const toolCalls = new Map<string, { name: string; args: unknown }>();

function textOf(content: unknown): string {
  return typeof content === "string" ? content : "";
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response: ServerResponse, body: unknown, status = 200) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

/** The reply for a prompt: a fixed text when a spec set one, else derived. */
function replyFor(model: string, user: string): string {
  const fixed = fixedReplies.get(model);
  if (fixed !== undefined) return fixed;
  return `Stub answer to: ${user.replace(/\s+/g, " ").trim().slice(0, 80)}`;
}

async function completion(request: IncomingMessage, response: ServerResponse) {
  const body = JSON.parse(await readBody(request)) as {
    model?: string;
    stream?: boolean;
    tools?: unknown[];
    messages?: WireMessage[];
  };
  const model = body.model ?? "unknown";
  const messages = body.messages ?? [];
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => textOf(message.content))
    .join("\n");
  const user = textOf(
    messages.filter((m) => m.role === "user").at(-1)?.content,
  );
  const list = calls.get(model) ?? [];
  list.push({ system, user });
  calls.set(model, list);

  const wanted = toolCalls.get(model);
  const hasToolResult = messages.some((message) => message.role === "tool");
  if (wanted && body.stream && body.tools?.length && !hasToolResult) {
    // The model asks for its tool; once the result is in, it answers in text.
    const delta = {
      tool_calls: [
        {
          index: 0,
          id: "call_e2e",
          function: {
            name: wanted.name,
            arguments: JSON.stringify(wanted.args),
          },
        },
      ],
    };
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`);
    response.write(
      `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }] })}\n\n`,
    );
    response.end("data: [DONE]\n\n");
    return;
  }

  const text = replyFor(model, user);
  const usage = { prompt_tokens: 12, completion_tokens: 7 };
  if (!body.stream) {
    sendJson(response, {
      choices: [{ message: { role: "assistant", content: text } }],
      usage,
    });
    return;
  }
  response.writeHead(200, { "content-type": "text/event-stream" });
  const half = Math.ceil(text.length / 2);
  for (const piece of [text.slice(0, half), text.slice(half)]) {
    response.write(
      `data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`,
    );
  }
  response.write(`data: ${JSON.stringify({ choices: [], usage })}\n\n`);
  response.end("data: [DONE]\n\n");
}

async function control(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", "http://stub");
  const model = url.searchParams.get("model") ?? "";
  if (url.pathname === "/__stub/calls") {
    sendJson(response, { calls: calls.get(model) ?? [] });
    return;
  }
  if (url.pathname === "/__stub/reply") {
    const { text } = JSON.parse(await readBody(request)) as { text?: string };
    if (typeof text === "string") fixedReplies.set(model, text);
    else fixedReplies.delete(model);
    sendJson(response, { ok: true });
    return;
  }
  if (url.pathname === "/__stub/tool-call") {
    const wanted = JSON.parse(await readBody(request)) as {
      name?: string;
      args?: unknown;
    };
    if (typeof wanted.name === "string") {
      toolCalls.set(model, { name: wanted.name, args: wanted.args ?? {} });
    } else {
      toolCalls.delete(model);
    }
    sendJson(response, { ok: true });
    return;
  }
  sendJson(response, { error: "not_found" }, 404);
}

createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://stub").pathname;
  const handler = path.startsWith("/__stub/")
    ? control
    : path.endsWith("/chat/completions") && request.method === "POST"
      ? completion
      : null;
  if (!handler) {
    sendJson(response, { error: "not_found" }, 404);
    return;
  }
  handler(request, response).catch(() =>
    sendJson(response, { error: "bad" }, 500),
  );
}).listen(PORT, "127.0.0.1", () => {
  console.log(`openai stub on http://127.0.0.1:${PORT}`);
});
