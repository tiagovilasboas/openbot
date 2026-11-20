// The two Bot API calls the bridge needs. The token sits in the URL path,
// so no error or log line here ever includes the URL.

const API = "https://api.telegram.org";
/** Long polling wait, in seconds; the request timeout leaves room for it. */
export const POLL_SECONDS = 25;

export type TelegramUpdate = {
  update_id: number;
  message?: {
    date: number;
    text?: string;
    chat: { id: number; type: string };
  };
};

export type TelegramApi = {
  getUpdates(offset: number, signal?: AbortSignal): Promise<TelegramUpdate[]>;
  sendMessage(chatId: string, text: string): Promise<boolean>;
};

function isUpdate(v: unknown): v is TelegramUpdate {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as TelegramUpdate).update_id === "number"
  );
}

export function createTelegramApi(
  token: string,
  fetchImpl: typeof fetch = fetch,
): TelegramApi {
  const call = async (
    method: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    const response = await fetchImpl(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      redirect: "error",
      signal,
    });
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      result?: unknown;
    } | null;
    if (!response.ok || data?.ok !== true) {
      throw new Error(`telegram_${method}_${response.status}`);
    }
    return data.result;
  };
  return {
    async getUpdates(offset, signal) {
      const result = await call(
        "getUpdates",
        { offset, timeout: POLL_SECONDS, allowed_updates: ["message"] },
        signal ?? AbortSignal.timeout((POLL_SECONDS + 10) * 1000),
      );
      return Array.isArray(result) ? result.filter(isUpdate) : [];
    },
    async sendMessage(chatId, text) {
      try {
        await call(
          "sendMessage",
          { chat_id: chatId, text },
          AbortSignal.timeout(15_000),
        );
        return true;
      } catch {
        return false;
      }
    },
  };
}
