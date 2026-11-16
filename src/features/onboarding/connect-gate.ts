export type ConnectGate =
  /** Still asking the server whether it has a model: do not flash a lock. */
  | "checking"
  /** No model anywhere: connecting comes first. */
  | "locked"
  /** A model is ready: agents and the composer work. */
  | "open";

export interface ConnectGateInput {
  /** The user's own model or the server's is ready to answer. */
  isConfigured: boolean;
  /** The server has said whether it has a model. */
  serverChecked: boolean;
}

export function connectGate(input: ConnectGateInput): ConnectGate {
  if (input.isConfigured) return "open";
  return input.serverChecked ? "locked" : "checking";
}
