import { createHash } from "node:crypto";

/** A finished reply: the HTTP status and JSON body the route answers with. */
export type SendOutcome = { status: number; body: unknown };

export type SendReplayResult =
  | { kind: "outcome"; outcome: SendOutcome; replayed: boolean }
  | { kind: "conflict" }
  /** The first request with this id threw; the waiter has no reply to share. */
  | { kind: "failed" };

type Entry = {
  fingerprint: string;
  expiresAt: number;
  outcome?: SendOutcome;
  pending?: Promise<SendOutcome>;
};

export type SendReplayOptions = {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
};

/** One-way digest of the request body; the raw body is never kept. */
export function fingerprintBody(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload) ?? "")
    .digest("hex");
}

/**
 * Remembers successful replies per send id for a short time, so a repeated
 * send returns the stored reply instead of calling the model again. A request
 * that arrives while the first is running shares its result. Failures are
 * never kept: a retry with the same id runs again. In-memory and bounded.
 */
export function createSendReplay(options: SendReplayOptions = {}) {
  const ttlMs = options.ttlMs ?? 10 * 60_000;
  const maxEntries = options.maxEntries ?? 300;
  const now = options.now ?? Date.now;
  const entries = new Map<string, Entry>();

  function prune() {
    const t = now();
    for (const [key, entry] of entries) {
      if (!entry.pending && entry.expiresAt <= t) entries.delete(key);
    }
    // Map iterates in insertion order, so the oldest settled entries go first.
    for (const [key, entry] of entries) {
      if (entries.size < maxEntries) break;
      if (!entry.pending) entries.delete(key);
    }
  }

  async function run(
    key: string,
    fingerprint: string,
    compute: () => Promise<SendOutcome>,
  ): Promise<SendReplayResult> {
    prune();
    const existing = entries.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) return { kind: "conflict" };
      if (existing.pending) {
        try {
          return {
            kind: "outcome",
            outcome: await existing.pending,
            replayed: true,
          };
        } catch {
          return { kind: "failed" };
        }
      }
      if (existing.outcome) {
        return { kind: "outcome", outcome: existing.outcome, replayed: true };
      }
    }

    // Running entries count too; a full table serves the request uncached.
    if (entries.size >= maxEntries) {
      return { kind: "outcome", outcome: await compute(), replayed: false };
    }

    const entry: Entry = { fingerprint, expiresAt: 0 };
    const pending = compute();
    entry.pending = pending;
    entries.set(key, entry);
    try {
      const outcome = await pending;
      if (outcome.status === 200 && entries.get(key) === entry) {
        entry.pending = undefined;
        entry.outcome = outcome;
        entry.expiresAt = now() + ttlMs;
      } else if (entries.get(key) === entry) {
        entries.delete(key);
      }
      return { kind: "outcome", outcome, replayed: false };
    } catch (error) {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    }
  }

  return { run, size: () => entries.size };
}

/** Shared by the non-streaming chat route for the life of the server. */
export const chatSendReplay = createSendReplay();
