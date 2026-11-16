/** Public contract of the connections core: the only entry for other folders. */
export {
  CONNECTION_IDS,
  connectionMethods,
  isConnectionId,
  type ConnectionId,
  type ConnectionMethods,
  type ConnectMethod,
} from "./connection-methods.ts";
export {
  canTakeCallback,
  connectRoute,
  type ConnectRoute,
} from "./connect-route.ts";
export {
  IDLE,
  isInFlight,
  nextConnectState,
  type ConnectEvent,
  type ConnectFailure,
  type ConnectPhase,
  type ConnectState,
} from "./connect-state.ts";
export type {
  Clock,
  CredentialStatus,
  CredentialStore,
  PendingAuth,
  PendingAuthStore,
} from "./connection-ports.ts";
