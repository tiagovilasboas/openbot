import type { MessageData } from "./ChatMessageItem.tsx";

/** Header that carries the client id of the user's send to the chat routes. */
export const CLIENT_MESSAGE_ID_HEADER = "idempotency-key";

/** Two identical sends this close together are one send (a double submit). */
export const DOUBLE_SUBMIT_WINDOW_MS = 1500;

const SHAPE = /^[A-Za-z0-9_-]{8,64}$/;

export function isClientMessageId(value: unknown): value is string {
  return typeof value === "string" && SHAPE.test(value);
}

/** A fresh id for one user send; the same id is reused by every retry of it. */
export function newClientMessageId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** The request header for a turn; empty when the message has no id. */
export function clientMessageIdHeaders(
  id: string | undefined,
): Record<string, string> {
  return id && isClientMessageId(id) ? { [CLIENT_MESSAGE_ID_HEADER]: id } : {};
}

export interface LastSend {
  id: string;
  text: string;
  at: number;
}

/**
 * The id for a send: the previous one when the same text goes out again
 * within the double-submit window, a new one otherwise.
 */
export function sendIdFor(
  last: LastSend | null,
  text: string,
  now: number,
  make: () => string = newClientMessageId,
): LastSend {
  if (last && last.text === text && now - last.at <= DOUBLE_SUBMIT_WINDOW_MS) {
    return { ...last, at: now };
  }
  return { id: make(), text, at: now };
}

/** True when the thread already holds the user message sent with this id. */
export function isAlreadySent(thread: MessageData[], id: string): boolean {
  return thread.some((m) => m.role === "user" && m.clientId === id);
}

/** The client id stored on a user message of the thread, if it has one. */
export function clientIdOf(
  thread: MessageData[],
  userMessageId: number,
): string | undefined {
  return thread.find((m) => m.id === userMessageId && m.role === "user")
    ?.clientId;
}
