export interface LocalAuthCredentials {
  salt: string;
  hash: string;
  iterations: number;
  hint?: string;
  createdAt: string;
}

export interface LocalAuthState {
  hasPassword: boolean;
  isLocked: boolean;
  hint: string | null;
  error: string | null;
}
