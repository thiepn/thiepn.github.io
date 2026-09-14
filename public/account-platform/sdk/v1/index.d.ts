export type SignOutScope = 'local' | 'others' | 'global';
export type AccountFailureCategory = 'network' | 'authentication' | 'authorization' | 'rate_limit' | 'service' | 'request' | 'unknown';
export interface ThiepnUser { id: string; email: string | null; }
export interface ThiepnSession { authenticated: true; user: ThiepnUser | null; expiresAt: number | null; }
export interface ThiepnDiagnostics {
  sdkVersion: string; accountContract: string; operationsVersion: string; projectRef: string;
  sessionAuthority: 'thiepn-account'; appSlug: string; hasSession: boolean; hasUser: boolean;
}
export interface ThiepnAccountConfig {
  sdkVersion: '1.0.0'; sdkContract: '1.x'; accountContract: '1.0'; operationsVersion: 'A7.1';
  projectRef: string; url: string; publishableKey: string; storageKey: string;
  productionOrigin: 'https://thiepn.dev'; sessionAuthority: 'thiepn-account';
}
export const THIEPN_ACCOUNT: Readonly<ThiepnAccountConfig>;
export function assertAllowedRedirect(value?: string, options?: { baseUrl?: string }): string;
export function classifyAccountError(error: unknown): AccountFailureCategory;
export function createThiepnClient(createClient: (...args: any[]) => any): any;
export function createThiepnAccount(options: {
  client?: any; createClient?: (...args: any[]) => any; appSlug: string; redirectTo?: string;
}): Readonly<{
  config: Readonly<ThiepnAccountConfig>;
  client: any;
  getSession(): Promise<ThiepnSession | null>;
  getUser(): Promise<ThiepnUser | null>;
  onAuthStateChange(callback: (state: Readonly<{ event: string; session: ThiepnSession | null }>) => void): any;
  signInWithPassword(input: { email: string; password: string }): Promise<ThiepnSession | null>;
  signUpWithPassword(input: { email: string; password: string; redirectTo?: string }): Promise<Readonly<{ session: ThiepnSession | null; user: ThiepnUser | null }>>;
  signInWithGoogle(input?: { redirectTo?: string }): Promise<any>;
  requestPasswordReset(input: { email: string; redirectTo?: string }): Promise<true>;
  refreshSession(): Promise<ThiepnSession | null>;
  signOut(input?: { scope?: SignOutScope }): Promise<true>;
  diagnostics(): Promise<Readonly<ThiepnDiagnostics>>;
  classifyError: typeof classifyAccountError;
  assertAllowedRedirect: typeof assertAllowedRedirect;
}>;
