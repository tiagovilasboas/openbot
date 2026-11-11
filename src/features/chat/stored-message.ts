import { isLanguage } from "../language/language.ts";
import type { AttachmentSummary } from "@/features/attachments/attachment-summary.ts";
import { sanitizeBotProfile } from "../bots/bot-storage.ts";
import { sanitizeCrewStep } from "../crew/crew-step-record.ts";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import { safeGithubUrl } from "../github/safe-github-url.ts";
import type { MessageData } from "./ChatMessageItem.tsx";

/** Messages kept per bot; the newest win. */
export const STORED_MESSAGES_MAX = 500;
/** A reply longer than this was never produced by the app. */
export const STORED_TEXT_MAX = 100_000;
/** Raw stored text above this is not parsed at all. */
export const STORED_MESSAGES_MAX_RAW = 20_000_000;

const SHORT_MAX = 200;
const REASON_MAX = 500;
const ITEMS_MAX = 30;
const ATTACHMENTS_MAX = 20;
const LABELS_MAX = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function short(value: unknown, max = SHORT_MAX): string | null {
  return typeof value === "string" ? value.slice(0, max) : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;
}

function readAttachments(raw: unknown): AttachmentSummary[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const kept: AttachmentSummary[] = [];
  for (const entry of raw.slice(0, ATTACHMENTS_MAX)) {
    if (!isRecord(entry)) continue;
    const name = short(entry.name);
    const size = count(entry.size);
    if (name === null || size === null) continue;
    kept.push({
      name,
      size,
      ...(entry.truncated === true ? { truncated: true } : {}),
    });
  }
  return kept.length > 0 ? kept : undefined;
}

function readItem(raw: unknown): GitHubItem | null {
  if (!isRecord(raw)) return null;
  const id = count(raw.id);
  const number = count(raw.number);
  const commentsCount = count(raw.commentsCount);
  const title = short(raw.title, 500);
  const author = short(raw.author);
  const createdAt = short(raw.createdAt, 40);
  const url = safeGithubUrl(raw.url);
  if (
    id === null ||
    number === null ||
    commentsCount === null ||
    title === null ||
    author === null ||
    createdAt === null ||
    url === null ||
    typeof raw.isPullRequest !== "boolean"
  ) {
    return null;
  }
  const labels = Array.isArray(raw.labels)
    ? raw.labels
        .slice(0, LABELS_MAX)
        .filter((l): l is string => typeof l === "string")
        .map((l) => l.slice(0, SHORT_MAX))
    : [];
  return {
    id,
    number,
    title,
    author,
    url,
    labels,
    isPullRequest: raw.isPullRequest,
    commentsCount,
    createdAt,
  };
}

function readGithub(
  raw: unknown,
): { repo: GitHubRepoRef; items: GitHubItem[] } | undefined {
  if (!isRecord(raw) || !isRecord(raw.repo) || !Array.isArray(raw.items)) {
    return undefined;
  }
  const owner = short(raw.repo.owner);
  const repo = short(raw.repo.repo);
  if (owner === null || repo === null) return undefined;
  const items = raw.items
    .slice(0, ITEMS_MAX)
    .map(readItem)
    .filter((item): item is GitHubItem => item !== null);
  return { repo: { owner, repo }, items };
}

function readFailover(raw: unknown): MessageData["failover"] {
  if (!isRecord(raw)) return undefined;
  const fromModel = short(raw.fromModel);
  const toModel = short(raw.toModel);
  const reason = short(raw.reason, REASON_MAX);
  if (fromModel === null || toModel === null || reason === null) {
    return undefined;
  }
  return { fromModel, toModel, reason };
}

/**
 * Reads one stored message; null when it is not usable. Only known fields
 * survive, each type-checked and capped.
 */
export function sanitizeStoredMessage(raw: unknown): MessageData | null {
  if (!isRecord(raw)) return null;
  if (raw.role !== "user" && raw.role !== "assistant") return null;
  if (typeof raw.text !== "string") return null;
  if (typeof raw.id !== "number" || !Number.isSafeInteger(raw.id)) return null;
  if (raw.id < 0) return null;

  const message: MessageData = {
    id: raw.id,
    language: isLanguage(raw.language) ? raw.language : "en",
    role: raw.role,
    text: raw.text.slice(0, STORED_TEXT_MAX),
  };

  const delegatedBot = sanitizeBotProfile(raw.delegatedBot);
  if (delegatedBot) message.delegatedBot = delegatedBot;
  const crewStep = sanitizeCrewStep(raw.crewStep);
  if (crewStep) message.crewStep = crewStep;
  const github = readGithub(raw.github);
  if (github) message.github = github;
  const modelBadge = short(raw.modelBadge);
  if (modelBadge) message.modelBadge = modelBadge;
  const attachments = readAttachments(raw.attachments);
  if (attachments) message.attachments = attachments;
  if (raw.incomplete === "error" || raw.incomplete === "cancelled") {
    message.incomplete = raw.incomplete;
  }
  const failover = readFailover(raw.failover);
  if (failover) message.failover = failover;
  return message;
}

/** The usable messages of a stored value, newest kept when over the cap. */
export function sanitizeStoredMessages(raw: unknown): MessageData[] {
  if (!Array.isArray(raw)) return [];
  const start = Math.max(0, raw.length - STORED_MESSAGES_MAX);
  const kept: MessageData[] = [];
  for (const entry of raw.slice(start)) {
    const message = sanitizeStoredMessage(entry);
    if (message) kept.push(message);
  }
  return kept;
}
