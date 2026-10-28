/** Typed, declarative relationships only. They never copy the target payload. */
import { preferenceService } from '../personalization/preferenceService';
import { parseOwnerRef } from './ownerResourceRefs';

const KEY = 'keep_source_links_v1';
export interface KeepResourceLink {
  readonly id: string;
  readonly fromUri: string;
  readonly toUri: string;
  readonly label: string;
  readonly createdAt: string;
}

export function safeResourceLinks(value: unknown): KeepResourceLink[] {
  if (!Array.isArray(value)) return [];
  const pairs = new Set<string>();
  const links: KeepResourceLink[] = [];
  for (const entry of value.slice(0, 1000)) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Partial<KeepResourceLink>;
    if (!parseOwnerRef(item.fromUri) || !parseOwnerRef(item.toUri) || item.fromUri === item.toUri) continue;
    if (typeof item.id !== 'string' || !item.id || typeof item.label !== 'string' || item.label.length > 120 || typeof item.createdAt !== 'string') continue;
    const pair = `${item.fromUri}\u0000${item.toUri}`;
    if (pairs.has(pair)) continue;
    pairs.add(pair);
    links.push(item as KeepResourceLink);
  }
  return links;
}

export const resourceLinks = {
  get(): KeepResourceLink[] {
    return safeResourceLinks(preferenceService.get<unknown>(KEY, [], 'global-synced'));
  },
  subscribe(cb: (links: KeepResourceLink[]) => void): () => void {
    return preferenceService.subscribe(KEY, value => cb(safeResourceLinks(value)));
  },
  async connect(fromUri: string, toUri: string, label = 'related'): Promise<KeepResourceLink> {
    if (!parseOwnerRef(fromUri) || !parseOwnerRef(toUri) || fromUri === toUri) throw new Error('Invalid resource connection');
    if (!label.trim() || label.length > 120) throw new Error('Invalid relation label');
    const current = this.get();
    const prior = current.find(item => item.fromUri === fromUri && item.toUri === toUri);
    if (prior) return prior;
    if (current.length >= 1000) throw new Error('Connection capacity reached; remove older links first');
    const link: KeepResourceLink = { id: crypto.randomUUID(), fromUri, toUri, label: label.trim(), createdAt: new Date().toISOString() };
    await preferenceService.set(KEY, [...current, link], 'global-synced');
    return link;
  },
  async importVerified(records: unknown): Promise<number> {
    const incoming = safeResourceLinks(records);
    const current = this.get();
    const identities = new Set(current.map(link => `${link.fromUri}\u0000${link.toUri}`));
    const imported: KeepResourceLink[] = [];
    for (const candidate of incoming) {
      const key = `${candidate.fromUri}\u0000${candidate.toUri}`;
      if (identities.has(key) || current.length + imported.length >= 1000) continue;
      identities.add(key);
      imported.push(candidate);
    }
    if (imported.length) await preferenceService.set(KEY, [...current, ...imported], 'global-synced');
    return imported.length;
  },
  async remove(id: string): Promise<void> {
    await preferenceService.set(KEY, this.get().filter(link => link.id !== id), 'global-synced');
  },
};
