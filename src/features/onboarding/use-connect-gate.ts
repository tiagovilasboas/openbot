import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { connectGate } from "./connect-gate.ts";
import { firstRunCopy } from "./first-run-copy.ts";

/** What the shell locks while no model is connected, and why. */
export function useConnectGate(
  language: ChatLanguage,
  isConfigured: boolean,
  serverChecked: boolean,
) {
  const state = connectGate({ isConfigured, serverChecked });
  const locked = state === "locked";
  const copy = firstRunCopy[language];
  return {
    locked,
    checking: state === "checking",
    agentsReason: locked ? copy.agentsLocked : undefined,
    composerReason: locked ? copy.composerLocked : undefined,
  };
}
