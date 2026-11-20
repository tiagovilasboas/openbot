// Telegram bridge settings from the server environment. Pure.

/** Shape of a token from @BotFather: "<digits>:<secret>". */
const TOKEN = /^\d{5,15}:[A-Za-z0-9_-]{30,64}$/;
const CHAT_ID = /^-?\d{1,20}$/;
const BOT_ID = /^[A-Za-z0-9_-]{1,80}$/;

export type TelegramConfig =
  | { enabled: false; problem?: string }
  | {
      enabled: true;
      token: string;
      /** Chats that may talk to the bot; everyone else is ignored. */
      allowedChats: ReadonlySet<string>;
      /** Open Bot bot that answers; none means the main bot. */
      botId?: string;
    };

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Off unless TELEGRAM_BOT_TOKEN is set. A token with no allowed chat stays
 * off too: an open bot would answer anyone who finds it.
 */
export function parseTelegramConfig(env: Env): TelegramConfig {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { enabled: false };
  if (!TOKEN.test(token)) return { enabled: false, problem: "bad_token" };
  const chats = (env.TELEGRAM_ALLOWED_CHATS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (chats.length === 0 || chats.some((id) => !CHAT_ID.test(id))) {
    return { enabled: false, problem: "no_allowed_chats" };
  }
  const botId = env.TELEGRAM_OPENBOT_BOT_ID?.trim();
  if (botId && !BOT_ID.test(botId)) {
    return { enabled: false, problem: "bad_bot_id" };
  }
  return {
    enabled: true,
    token,
    allowedChats: new Set(chats),
    ...(botId ? { botId } : {}),
  };
}
