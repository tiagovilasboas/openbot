import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { connectGate } from "./connect-gate.ts";
import { firstRunCopy } from "./first-run-copy.ts";

/** What the shell locks while no model is connected, and why. */
export function useConnectGate(
  language: ChatLanguage,
  isConfigured: boolean,
  serverChecked: boolean,
) {
  const locked = connectGate({ isConfigured, serverChecked }) === "locked";
  const copy = firstRunCopy[language];
  return {
    locked,
    agentsReason: locked ? copy.agentsLocked : undefined,
    composerReason: locked ? copy.composerLocked : undefined,
  };
}
