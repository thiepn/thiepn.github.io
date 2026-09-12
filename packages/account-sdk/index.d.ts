export interface ThiepnIdentity { provider?: string }
export interface ThiepnMfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  phone?: string;
  last_challenged_at?: string;
}
export interface ThiepnUser {
  id: string;
  email?: string;
  new_email?: string;
  email_confirmed_at?: string;
  created_at?: string;
  last_sign_in_at?: string;
  app_metadata?: { provider?: string; providers?: string[]; [key: string]: unknown };
  user_metadata?: Record<string, unknown>;
  identities?: ThiepnIdentity[];
  factors?: ThiepnMfaFactor[];
  [key: string]: unknown;
}
export interface ThiepnSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: ThiepnUser;
}
export interface ThiepnAmrEntry { method: string; timestamp: number; [key: string]: unknown }
export interface ThiepnSessionSecurity {
  aal: 'aal1' | 'aal2';
  sessionId: string | null;
  expiresAt: number | null;
  amr: ThiepnAmrEntry[];
}
export interface ThiepnAccountSessionRecord {
  session_id: string;
  created_at: string | null;
  updated_at: string | null;
  refreshed_at: string | null;
  not_after: string | null;
  user_agent: string | null;
  aal: string | null;
  is_current: boolean;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface AccountClientOptions {
  supabaseUrl?: string;
  publishableKey?: string;
  sessionKey?: string;
  timeoutMs?: number;
  refreshSkewSeconds?: number;
  storage?: StorageLike | null;
  fetch?: typeof globalThis.fetch;
  strictRemoteSignOut?: boolean;
}
export declare const THIEPN_ACCOUNT_VERSION: '1.1.0';
export declare const THIEPN_ACCOUNT_CONFIG: Readonly<{
  supabaseUrl: string;
  publishableKey: string;
  sessionKey: string;
  accountPath: string;
}>;
export declare const THIEPN_APPS: Readonly<Record<'notes' | 'diet' | 'wordstrike', Readonly<{ id: string; name: string; path: string }>>>;
export declare class ThiepnAccountError extends Error {
  status: number;
  code: string | null;
  payload: unknown;
  constructor(message: string, details?: { status?: number; code?: string | null; payload?: unknown });
}
export declare function parseSession(raw: string | object | null | undefined): ThiepnSession | null;
export declare function readSession(options?: { storage?: StorageLike | null; sessionKey?: string }): ThiepnSession | null;
export declare function writeSession(session: ThiepnSession, options?: { storage?: StorageLike | null; sessionKey?: string }): ThiepnSession;
export declare function clearSession(options?: { storage?: StorageLike | null; sessionKey?: string }): void;
export declare function migrateLegacySessions(options?: {
  storage?: StorageLike | null;
  legacyKeys?: string[];
  sessionKey?: string;
  removeLegacy?: boolean;
}): { session: ThiepnSession | null; migratedFrom: string | null };
export declare function getConnectedProviders(user: ThiepnUser | null | undefined): Set<string>;
export declare function hasProvider(user: ThiepnUser | null | undefined, provider: string): boolean;
export declare function getMfaFactors(user: ThiepnUser | null | undefined): ThiepnMfaFactor[];
export declare function getVerifiedMfaFactors(user: ThiepnUser | null | undefined): ThiepnMfaFactor[];
export declare function decodeJwtPayload(token: string | null | undefined): Record<string, unknown> | null;
export declare function getSessionSecurity(session: ThiepnSession | null | undefined): ThiepnSessionSecurity;
export declare function needsMfaChallenge(session: ThiepnSession | null | undefined, user?: ThiepnUser | null): boolean;
export declare function accountUrl(options?: { origin?: string }): string;
export declare function appUrl(appId: 'notes' | 'diet' | 'wordstrike', options?: { origin?: string }): string;
export interface AccountClient {
  version: string;
  config: Readonly<{ supabaseUrl: string; publishableKey: string; sessionKey: string; timeoutMs: number; refreshSkewSeconds: number }>;
  readSession(): ThiepnSession | null;
  writeSession(session: ThiepnSession): ThiepnSession;
  clearSession(): void;
  migrateLegacySessions(options?: { legacyKeys?: string[]; removeLegacy?: boolean }): { session: ThiepnSession | null; migratedFrom: string | null };
  getUser(session?: ThiepnSession | null): Promise<ThiepnUser | null>;
  refreshSession(session?: ThiepnSession | null): Promise<ThiepnSession>;
  ensureSession(options?: { verifyUser?: boolean }): Promise<ThiepnSession | null>;
  consumeAuthCallback(options?: { location?: Location; history?: History }): Promise<{ session: ThiepnSession; type: string | null } | null>;
  signInWithPassword(input: { email: string; password: string }): Promise<ThiepnSession>;
  requestEmailOtp(input?: { email?: string; shouldCreateUser?: boolean }): Promise<unknown>;
  verifyEmailOtp(input?: { email?: string; token?: string }): Promise<ThiepnSession>;
  signUp(input: { email: string; password: string; redirectTo?: string }): Promise<{ session: ThiepnSession | null; user: ThiepnUser | null }>;
  oauthUrl(input?: { provider?: string; redirectTo?: string; scopes?: string; query?: Record<string, string | number | boolean | null | undefined> }): string;
  requestPasswordReset(input: { email: string; redirectTo?: string }): Promise<unknown>;
  requestReauthentication(session?: ThiepnSession | null): Promise<unknown>;
  updateUser(patch: Record<string, unknown>, session?: ThiepnSession | null): Promise<ThiepnUser>;
  updateEmail(input: { email: string }): Promise<ThiepnUser>;
  updatePassword(input?: { password?: string; nonce?: string }): Promise<ThiepnUser>;
  listMfaFactors(session?: ThiepnSession | null): Promise<{ user: ThiepnUser | null; factors: ThiepnMfaFactor[] }>;
  enrollTotp(input?: { friendlyName?: string }, session?: ThiepnSession | null): Promise<{ id?: string; type?: string; totp?: { qr_code?: string; secret?: string; uri?: string }; [key: string]: unknown }>;
  challengeMfa(input?: { factorId?: string; channel?: 'sms' | 'whatsapp' | undefined }, session?: ThiepnSession | null): Promise<{ id?: string; [key: string]: unknown }>;
  verifyMfa(input?: { factorId?: string; challengeId?: string; code?: string }, session?: ThiepnSession | null): Promise<ThiepnSession>;
  unenrollMfa(input?: { factorId?: string }, session?: ThiepnSession | null): Promise<unknown>;
  signOut(options?: { scope?: 'local' | 'global' | 'others' | string }): Promise<void>;
  signOutOtherSessions(): Promise<void>;
  authFetch<T = unknown>(path: string, init?: RequestInit, session?: ThiepnSession | null): Promise<T>;
  listAccountSessions(session?: ThiepnSession | null): Promise<ThiepnAccountSessionRecord[]>;
  getSessionSecurity(): ThiepnSessionSecurity;
}
export declare function createAccountClient(options?: AccountClientOptions): AccountClient;
