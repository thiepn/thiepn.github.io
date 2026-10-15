/** Core P9 dashboard -> Hub read-only, privacy-minimal language projection.
 * The owner app's published P8 model is the only authority for workload/progress.
 * This parser is deliberately narrower than the Languages product: it displays
 * only approved app IDs and never touches raw StudyEvents, grades, or schedules.
 */
export type HubLanguageId = 'japanese' | 'french' | 'chinese';
export const HUB_LANGUAGE_IDS: readonly HubLanguageId[] = ['japanese', 'french', 'chinese'];
export type HubLanguageCard = {
  readonly appId: HubLanguageId;
  readonly name: string;
  readonly due: number;
  readonly todayEvents: number;
  readonly streakDays: number;
  readonly lastStudiedAt: string | null;
  readonly metrics: readonly { label: string; current: number; total?: number; unit?: string }[];
  readonly action: { label: string; route?: string };
  readonly generatedAt: string;
  readonly storedAt: string;
  readonly stale: boolean;
};
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const validDate = (x: unknown, now: number) => typeof x === 'string' && Number.isFinite(Date.parse(x)) && Date.parse(x) <= now + 5 * 60_000;
const nonnegative = (x: unknown) => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
const allowed = (x: unknown): x is HubLanguageId => HUB_LANGUAGE_IDS.includes(x as HubLanguageId);
const names: Record<HubLanguageId, string> = { japanese: 'Japanese', french: 'French', chinese: 'Chinese' };
/** A missing/hidden producer does NOT mean zero due items. */
export function visibleHubLanguages(payload: unknown, now = Date.now()): readonly HubLanguageCard[] {
  if (!object(payload) || payload.schema !== 'thiepn-language-dashboard' ||
      payload.schemaVersion !== 1 || payload.contractVersion !== 'p9-dashboard-v1' ||
      !Array.isArray(payload.enrollments) || !Array.isArray(payload.snapshots) ||
      !validDate(payload.generatedAt, now) || payload.snapshots.length > 100 || payload.enrollments.length > 100)
    throw new Error('Invalid languages dashboard contract');
  const visible = new Set<string>();
  for (const row of payload.enrollments) {
    if (!object(row) || typeof row.appId !== 'string' || typeof row.languageId !== 'string' ||
        typeof row.visible !== 'boolean') throw new Error('Invalid languages enrollment');
    if (row.visible && allowed(row.appId)) visible.add(row.appId + '\u0000' + row.languageId);
  }
  const cards: HubLanguageCard[] = [];
  const seen = new Set<HubLanguageId>();
  for (const item of payload.snapshots) {
    if (!object(item) || !allowed(item.appId) || typeof item.languageId !== 'string' ||
        !visible.has(item.appId + '\u0000' + item.languageId)) continue;
    if (seen.has(item.appId)) throw new Error('Duplicate visible language');
    const model = item.snapshot;
    if (!object(model) || model.schema !== 'thiepn-language-read-model' || model.schemaVersion !== 1 ||
        model.appId !== item.appId || model.languageId !== item.languageId ||
        !object(model.source) || model.source.authority !== 'consumer' ||
        !object(model.workload) || !nonnegative(model.workload.dueItems) ||
        !object(model.activity) || !nonnegative(model.activity.todayEvents) ||
        !nonnegative(model.activity.streakDays) || !Array.isArray(model.progress && object(model.progress) ? model.progress.metrics : null) ||
        !object(model.nextAction) || typeof model.nextAction.label !== 'string' ||
        !validDate(model.generatedAt, now) || !validDate(item.storedAt, now))
      throw new Error('Invalid producer language read model');
    const metrics: { label: string; current: number; total?: number; unit?: string }[] = [];
    for (const metric of (model.progress as { metrics: unknown[] }).metrics.slice(0, 3)) {
      if (!object(metric) || typeof metric.label !== 'string' || metric.label.length > 80 ||
          typeof metric.current !== 'number' || !Number.isFinite(metric.current) || metric.current < 0 ||
          (metric.total !== undefined && (typeof metric.total !== 'number' || !Number.isFinite(metric.total) || metric.total < 0))) throw new Error('Invalid source metric');
      metrics.push({ label: metric.label, current: metric.current,
        ...(typeof metric.total === 'number' ? { total: metric.total } : {}),
        ...(typeof metric.unit === 'string' && metric.unit.length <= 24 ? { unit: metric.unit } : {}) });
    }
    if (model.activity.lastStudiedAt !== null && !validDate(model.activity.lastStudiedAt, now))
      throw new Error('Invalid last studied date');
    if (model.nextAction.route !== undefined && (typeof model.nextAction.route !== 'string' || model.nextAction.route.length > 512))
      throw new Error('Invalid native action');
    seen.add(item.appId);
    cards.push({
      appId: item.appId, name: names[item.appId], due: model.workload.dueItems as number,
      todayEvents: model.activity.todayEvents as number, streakDays: model.activity.streakDays as number,
      lastStudiedAt: model.activity.lastStudiedAt as string | null,
      metrics, action: { label: model.nextAction.label.slice(0, 90),
        ...(typeof model.nextAction.route === 'string' ? { route: model.nextAction.route } : {}) },
      generatedAt: model.generatedAt as string, storedAt: item.storedAt as string,
      stale: now - Date.parse(model.generatedAt as string) > 60 * 60_000,
    });
  }
  return HUB_LANGUAGE_IDS.flatMap(id => cards.filter(card => card.appId === id));
}
/** Strictly keep owner-provided deep links inside that exact reviewed app origin. */
export function ownerLanguageLink(ownerUrl: string, route?: string): string {
  const owner = new URL(ownerUrl);
  if (owner.protocol !== 'https:') throw new Error('Untrusted owner app URL');
  if (!route) return owner.href;
  try {
    const candidate = new URL(route, owner.href);
    return candidate.protocol === 'https:' && candidate.origin === owner.origin && !candidate.username && !candidate.password
      ? candidate.href : owner.href;
  } catch { return owner.href; }
}
export async function fetchHubLanguages(token: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<readonly HubLanguageCard[]> {
  if (!token || token.length > 16384 || !/^[\x21-\x7e]+$/.test(token)) throw new Error('Invalid session');
  const response = await fetcher('https://thiepn-core-gateway.thiepn.workers.dev/v1/languages/dashboard', {
    method: 'GET', headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    cache: 'no-store', credentials: 'omit', redirect: 'error', signal,
  });
  if (!response.ok) throw new Error('Language source unavailable');
  const raw = await response.text();
  if (raw.length > 256 * 1024) throw new Error('Language summary too large');
  const envelope: unknown = JSON.parse(raw);
  if (!object(envelope) || envelope.ok !== true || !object(envelope.data)) throw new Error('Invalid language source');
  return visibleHubLanguages(envelope.data);
}
