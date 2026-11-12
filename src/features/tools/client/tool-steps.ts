/** How a tool call ended, as the thread keeps it. */
export type ToolStepStatus = "ok" | "error" | "denied" | "expired";

/** One tool call on an assistant message: never arguments, never results. */
export type ToolStep = {
  name: string;
  status: ToolStepStatus;
  summary: string;
};

/** Most steps kept on one message; a turn runs at most 6 calls. */
export const TOOL_STEPS_MAX = 8;
export const TOOL_STEP_SUMMARY_MAX = 300;
const NAME_MAX = 64;
const NAME = /^[a-z][a-z0-9_]*$/;
const STATUSES: readonly ToolStepStatus[] = [
  "ok",
  "error",
  "denied",
  "expired",
];

function readStep(raw: unknown): ToolStep | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const { name, status, summary } = raw as Record<string, unknown>;
  if (typeof name !== "string" || name.length > NAME_MAX || !NAME.test(name)) {
    return null;
  }
  const known = STATUSES.find((item) => item === status);
  if (!known) return null;
  return {
    name,
    status: known,
    summary:
      typeof summary === "string"
        ? summary.slice(0, TOOL_STEP_SUMMARY_MAX)
        : "",
  };
}

/**
 * The usable tool steps of a stored message (thread, conversation sync or
 * backup); undefined when there are none. Unknown fields never survive.
 */
export function sanitizeToolSteps(raw: unknown): ToolStep[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const steps = raw
    .slice(0, TOOL_STEPS_MAX)
    .map(readStep)
    .filter((step): step is ToolStep => step !== null);
  return steps.length > 0 ? steps : undefined;
}
