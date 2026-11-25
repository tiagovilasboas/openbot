import type { BrowserContext, APIRequestContext } from "@playwright/test";

const STUB_PORT = Number(process.env.OPENBOT_E2E_STUB_PORT) || 3900;
export const STUB_URL = `http://127.0.0.1:${STUB_PORT}`;

/**
 * A model name that only one spec uses, so the stub's calls and replies for
 * it never mix with another spec's.
 */
export function uniqueModel(label: string): string {
  return `e2e-${label}-${Date.now().toString(36)}`;
}

/** The header every first-party call to /api carries; curl-like callers add it. */
export const CLIENT_HEADERS = { "x-openbot-client": "1" };

export interface StubCall {
  system: string;
  user: string;
}

/** The calls the stub received for one model, oldest first. */
export async function stubCalls(
  request: APIRequestContext,
  model: string,
): Promise<StubCall[]> {
  const response = await request.get(
    `${STUB_URL}/__stub/calls?model=${encodeURIComponent(model)}`,
  );
  return ((await response.json()) as { calls: StubCall[] }).calls;
}

/** Makes the stub answer every call for `model` with the same text. */
export async function stubFixedReply(
  request: APIRequestContext,
  model: string,
  text: string,
): Promise<void> {
  await request.post(
    `${STUB_URL}/__stub/reply?model=${encodeURIComponent(model)}`,
    { data: { text } },
  );
}

/**
 * Makes the stub ask for a tool first, whenever a request offers tools and
 * has no tool result yet; with the result in, it answers in text.
 */
export async function stubToolCall(
  request: APIRequestContext,
  model: string,
  name: string,
  args: unknown,
): Promise<void> {
  await request.post(
    `${STUB_URL}/__stub/tool-call?model=${encodeURIComponent(model)}`,
    { data: { name, args } },
  );
}

/**
 * Makes the stub's answers for `model` never finish (`on`): a streamed one
 * stops after the first piece. `!on` answers in full again.
 */
export async function stubHang(
  request: APIRequestContext,
  model: string,
  on: boolean,
): Promise<void> {
  await request.post(
    `${STUB_URL}/__stub/hang?model=${encodeURIComponent(model)}`,
    { data: { on } },
  );
}

/** Points the saved model settings on the server at the stub. */
export async function useStubOnServer(
  request: APIRequestContext,
  model: string,
): Promise<void> {
  const response = await request.put("/api/settings", {
    headers: CLIENT_HEADERS,
    data: {
      settings: {
        // Other specs may have left these behind on the shared server.
        language: "pt",
        providersOff: null,
        modelConfig: {
          provider: "router",
          baseUrl: `${STUB_URL}/v1`,
          model,
        },
      },
    },
  });
  if (!response.ok()) throw new Error(`settings: ${response.status()}`);
}

/** Points the browser's stored model at the stub (before the app loads). */
export async function useStubInBrowser(
  context: BrowserContext,
  model: string,
): Promise<void> {
  await context.addInitScript(
    ({ url, name }) => {
      localStorage.setItem(
        "openbot_model_config",
        JSON.stringify({ provider: "router", baseUrl: url, model: name }),
      );
    },
    { url: `${STUB_URL}/v1`, name: model },
  );
}
