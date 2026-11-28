import type {
  Clock,
  ConnectCredential,
  ConnectFailure,
  ConnectionId,
  OAuthClientIdentityStore,
  PendingAuth,
} from "../core/index.ts";
import type { RandomBytes } from "./pkce.ts";

/** Fetch-shaped port, so the exchange is testable without a network. */
export type HttpClient = (url: string, init: RequestInit) => Promise<Response>;

export type ExchangeResult =
  | { ok: true; credential: ConnectCredential }
  | { ok: false; reason: ConnectFailure };

export interface StartOAuthInput {
  id: ConnectionId;
  origin: string;
  state: string;
  challenge: string;
  random?: RandomBytes;
  clientIdentities?: OAuthClientIdentityStore;
}

export interface BuiltAuthorize {
  authorizeUrl: string;
  redirectUri: string;
  nonce?: string;
}

export interface ExchangeCodeInput {
  id: ConnectionId;
  http: HttpClient;
  clock: Clock;
  code: string;
  pending: PendingAuth;
  clientId?: string | null;
  clientIdentities?: OAuthClientIdentityStore;
}

/** Provider-specific OAuth PKCE adapter used by the generic start/finish flows. */
export interface OAuthProviderSpec {
  buildAuthorizeUrl(input: StartOAuthInput): BuiltAuthorize | null;
  exchangeCode(input: ExchangeCodeInput): Promise<ExchangeResult>;
}
