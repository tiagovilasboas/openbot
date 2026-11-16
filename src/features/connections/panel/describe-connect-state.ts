import type { ChatLanguage } from "../../chat/respond-to-message.ts";
import { fillCopy } from "../../model/settings-copy.ts";
import type { ConnectFailure, ConnectState } from "../core/index.ts";
import { getConnectionsCopy } from "./connections-copy.ts";

export interface ConnectNoticeView {
  tone: "progress" | "success" | "error";
  message: string;
  /** Whether the person can dismiss it; progress ends by itself. */
  dismissible: boolean;
}

type Copy = ReturnType<typeof getConnectionsCopy>;

function failureMessage(c: Copy, reason: ConnectFailure): string {
  switch (reason) {
    case "denied":
      return c.failDenied;
    case "invalid_key":
      return c.failInvalidKey;
    case "state_mismatch":
      return c.failStateMismatch;
    case "network":
      return c.failNetwork;
    case "unavailable":
      return c.failUnavailable;
  }
}

/** The notice for a Connect state, or null when there is nothing to say. */
export function describeConnectState(
  state: ConnectState,
  serviceName: string,
  language: ChatLanguage,
): ConnectNoticeView | null {
  const c = getConnectionsCopy(language);
  const values = { name: serviceName };
  switch (state.phase) {
    case "idle":
      return null;
    case "starting":
      return {
        tone: "progress",
        message: fillCopy(c.oauthStarting, values),
        dismissible: false,
      };
    case "waiting":
      return {
        tone: "progress",
        message: fillCopy(c.oauthWaiting, values),
        dismissible: false,
      };
    case "verifying":
      return {
        tone: "progress",
        message: c.oauthVerifying,
        dismissible: false,
      };
    case "connected":
      return {
        tone: "success",
        message: fillCopy(c.oauthConnected, values),
        dismissible: true,
      };
    case "expired":
      return { tone: "error", message: c.oauthExpired, dismissible: true };
    case "failed":
      return {
        tone: "error",
        message: failureMessage(c, state.reason),
        dismissible: true,
      };
  }
}
