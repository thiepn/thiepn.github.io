import { providerAction } from '../providers/registry';
import { deriveDailyHomeAvailability, type DailyHomeAvailability } from './daily-home-availability';
import { libraryContinueUrl } from '../hub-library-session';
import type { ContinueItem, ProviderId, ProviderResult, ProviderStatus } from '../providers/types';

export interface PrismContinueView {
  state: 'empty' | 'ready' | 'stale' | 'offline' | 'error' | 'unconnected' | 'unsupported';
  providerId: ProviderId | null;
  title: string | null;
  updatedAt: string | null;
  href: string | null;
  progress: number | null;
}

export interface PrismNowItem {
  id: string;
  providerId: ProviderId;
  title: string;
  detail: string | null;
  href: string;
  priority: number;
}

export interface PrismProviderHomeView {
  continue: PrismContinueView;
  now: PrismNowItem[];
  study: { providerId: 'tms60'; dueTaskCount: number; dueVerseCount: number; newVerseCount: number; href: string } | null;
  recent: { providerId: ProviderId; title: string; updatedAt: string; href: string }[];
  availability: DailyHomeAvailability;
}

const severity: Record<ProviderStatus, number> = {
  ready: 0,
  empty: 0,
  stale: 1,
  offline: 2,
  error: 3,
  unconnected: 4,
  unsupported: 5,
};

function continueHref(providerId: ProviderId, item: ContinueItem): string | null {
  if (providerId === 'library') return libraryContinueUrl(item);
  if (providerId === 'tms60') {
    const base = providerAction('tms60', 'open');
    return base ? `${base}#hub=${encodeURIComponent(item.resourceId)}` : null;
  }
  return providerAction(providerId, 'open');
}

function progressFor(providerId: ProviderId, item: ContinueItem): number | null {
  if (providerId !== 'library') return null;
  return typeof item.current === 'number' && Number.isFinite(item.current)
    ? Math.max(0, Math.min(1, item.current))
    : null;
}

function bestUnavailable(results: readonly ProviderResult[]): PrismContinueView {
  const candidate = [...results]
    .filter((result) => result.status !== 'ready' && result.status !== 'empty')
    .sort((a, b) => severity[a.status] - severity[b.status])[0];

  return {
    state: candidate?.status ?? 'empty',
    providerId: candidate?.providerId ?? null,
    title: null,
    updatedAt: null,
    href: null,
    progress: null,
  };
}

export function buildPrismProviderHomeView(results: readonly ProviderResult[]): PrismProviderHomeView {
  const continueResults = results.filter((result) => result.operation === 'continue');
  const summaryResults = results.filter((result) => result.operation === 'summary');

  const continueItems = continueResults.flatMap((result) => {
    const envelope = result.envelope;
    if (result.status !== 'ready' || !envelope || !envelope.data) return [];
    return envelope.data.items.map((item) => ({ providerId: result.providerId, item }));
  });

  continueItems.sort((a, b) => Date.parse(b.item.updatedAt) - Date.parse(a.item.updatedAt));
  const best = continueItems[0];

  const continueView: PrismContinueView = best
    ? {
        state: 'ready',
        providerId: best.providerId,
        title: best.item.title,
        updatedAt: best.item.updatedAt,
        href: continueHref(best.providerId, best.item),
        progress: progressFor(best.providerId, best.item),
      }
    : continueResults.some((result) => result.status === 'empty')
      ? { state: 'empty', providerId: null, title: null, updatedAt: null, href: null, progress: null }
      : bestUnavailable(continueResults);

  const now: PrismNowItem[] = [];
  for (const result of summaryResults) {
    const envelope = result.envelope;
    if (result.providerId !== 'tms60' || result.status !== 'ready' || !envelope || !envelope.data) continue;

    const due = envelope.data.dueTaskCount ?? 0;
    if (due > 0) {
      const href = providerAction('tms60', 'open');
      if (href) {
        now.push({
          id: 'tms60:due',
          providerId: 'tms60',
          title: `${due} Bible ${due === 1 ? 'review' : 'reviews'} due`,
          detail: envelope.data.dueVerseCount ? `${envelope.data.dueVerseCount} ${envelope.data.dueVerseCount === 1 ? 'verse' : 'verses'}` : null,
          href,
          priority: 100,
        });
      }
    }
  }

  now.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const studyResult = summaryResults.find(result => result.providerId === 'tms60' && ['ready', 'empty'].includes(result.status) && result.envelope?.data);
  const studyData = studyResult?.envelope?.data;
  const studyHref = providerAction('tms60', 'open');
  const study = studyData && studyHref ? { providerId: 'tms60' as const,
    dueTaskCount: studyData.dueTaskCount ?? 0, dueVerseCount: studyData.dueVerseCount ?? 0,
    newVerseCount: studyData.newVerseCount ?? 0, href: studyHref } : null;
  const recent = summaryResults.flatMap(result => result.status === 'ready' ? (result.envelope?.data?.items ?? []).flatMap(item => {
    const href = continueHref(result.providerId, item);
    return href ? [{ providerId: result.providerId, title: item.title, updatedAt: item.updatedAt, href }] : [];
  }) : []).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 5);
  const availability = deriveDailyHomeAvailability(results, {
    continue: Boolean(best),
    now: now.length > 0,
    study: study !== null,
    recent: recent.length > 0,
  });
  // A successful empty response from one provider does not justify hiding
  // a failed or expired contribution from another provider.
  if (!best && availability.continue !== 'disconnected' && continueView.state !== availability.continue) {
    continueView.state = availability.continue;
    continueView.providerId = results.find(result =>
      result.operation === 'continue' && result.status === availability.continue,
    )?.providerId ?? null;
  }
  return { continue: continueView, now: now.slice(0, 3), study, recent, availability };
}
