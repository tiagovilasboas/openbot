import type { ApprovalCall } from "../tool-turn-events.ts";
import type { ToolProgressEvent } from "./tool-stream-events.ts";
import {
  TOOL_STEP_SUMMARY_MAX,
  TOOL_STEPS_MAX,
  type ToolStep,
  type ToolStepStatus,
} from "./tool-steps.ts";

/** A step while the turn is open: it may still run or wait for the user. */
export type LiveToolStep = {
  callId: string;
  name: string;
  status: ToolStepStatus | "running" | "pending";
  summary: string;
};

/** The server's fixed tag for a call the user refused. */
const DENIED_TAG = "denied_by_user";

function upsert(
  steps: readonly LiveToolStep[],
  callId: string,
  change: (step: LiveToolStep | undefined) => LiveToolStep,
): LiveToolStep[] {
  const index = steps.findIndex((step) => step.callId === callId);
  if (index === -1) return [...steps, change(undefined)];
  return steps.map((step, at) => (at === index ? change(step) : step));
}

/** Folds one tool event into the turn's steps; other events change nothing. */
export function applyToolEvent(
  steps: readonly LiveToolStep[],
  event: ToolProgressEvent,
): LiveToolStep[] {
  if (event.type === "tool_call") {
    return upsert(steps, event.callId, () => ({
      callId: event.callId,
      name: event.name,
      status: "running",
      summary: event.preview,
    }));
  }
  if (event.type === "tool_result") {
    const status: ToolStepStatus = event.ok
      ? "ok"
      : event.preview === DENIED_TAG
        ? "denied"
        : "error";
    return upsert(steps, event.callId, (step) => ({
      callId: event.callId,
      name: step?.name ?? "tool",
      status,
      summary: event.preview,
    }));
  }
  return [...steps];
}

/** The calls the turn paused on now wait for the user. */
export function markPending(
  steps: readonly LiveToolStep[],
  calls: readonly ApprovalCall[],
): LiveToolStep[] {
  return calls.reduce<LiveToolStep[]>(
    (next, call) =>
      upsert(next, call.callId, () => ({
        callId: call.callId,
        name: call.name,
        status: "pending",
        summary: call.preview,
      })),
    [...steps],
  );
}

/** A pause that can no longer be resumed: its waiting calls expired. */
export function expirePending(steps: readonly LiveToolStep[]): LiveToolStep[] {
  return steps.map((step) =>
    step.status === "pending" ? { ...step, status: "expired" } : step,
  );
}

/**
 * The steps as the thread stores them. A call still running when the stream
 * ended failed; one still waiting is stored as expired, since a reload can
 * never resume it.
 */
export function toStoredSteps(steps: readonly LiveToolStep[]): ToolStep[] {
  return steps.slice(-TOOL_STEPS_MAX).map(({ name, status, summary }) => ({
    name,
    status:
      status === "running"
        ? "error"
        : status === "pending"
          ? "expired"
          : status,
    summary: summary.slice(0, TOOL_STEP_SUMMARY_MAX),
  }));
}

/** Whether any tool is running now (the activity line says so). */
export function toolRunning(steps: readonly LiveToolStep[]): boolean {
  return steps.some((step) => step.status === "running");
}
