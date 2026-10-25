export interface ReleaseLaunch { id: string; title: string; ownerRepo: string; url: string; category: string; [key: string]: unknown }
export interface ReleaseRegistry { schemaVersion: number; policyId: string; certificates: unknown[] }
export const RELEASE_POLICY: string;
export const RELEASE_GATES: readonly string[];
export const GATE_RESULTS: readonly string[];
export function validateReleaseRegistry(registry: ReleaseRegistry): ReleaseRegistry;
export function certifiedLaunchEntries<T extends ReleaseLaunch>(manifest: { entries: T[] }, registry: ReleaseRegistry): T[];
export function validateDevelopmentInventory(inventory: unknown, manifest: { entries: ReleaseLaunch[] }): unknown;
