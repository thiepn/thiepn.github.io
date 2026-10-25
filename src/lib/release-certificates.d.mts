export interface ReleaseLaunch { id: string; title: string; ownerRepo: string; url: string; category: string; [key: string]: unknown }
export interface ReleaseRegistry { schemaVersion: number; policyId: string; certificates: unknown[] }
export const RELEASE_POLICY: string;
export const RELEASE_GATES: readonly string[];
export const GATE_RESULTS: readonly string[];
export function validateReleaseRegistry(registry: ReleaseRegistry): ReleaseRegistry;
export interface ReleasePromotionAuthority { schemaVersion: number; policyId: string; publicKeyPem: string | null; receipts: Array<{appId: string; releaseSha: string; certificateDigest: string; signature: string}> }
export function certificateDigest(certificate: unknown): string;
export function promotionSigningPayload(certificate: unknown): Uint8Array;
export function certifiedLaunchEntries<T extends ReleaseLaunch>(manifest: { entries: T[] }, registry: ReleaseRegistry, promotions?: ReleasePromotionAuthority): T[];
export function validateDevelopmentInventory(inventory: unknown, manifest: { entries: ReleaseLaunch[] }): unknown;
