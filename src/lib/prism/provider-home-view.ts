import { providerAction } from '../providers/registry';
import type { ContinueItem, Operation, ProviderId, ProviderResult, ProviderStatus } from '../providers/types';

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

export interface PrismProviderContribution {
  operation: Operation;
  result: ProviderResult;
}

export interface PrismProviderHomeView {
  continue: PrismContinueView;
  now: PrismNowItem[];
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
  if (providerId === 'library') return providerAction('library', 'continue-in-app');
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

function bestUnavailable(contributions: readonly PrismProviderContribution[]): PrismContinueView {
  const candidate = [...contributions]
    .map((item) => item.result)
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

export function buildPrismProviderHomeView(contributions: readonly PrismProviderContribution[]): PrismProviderHomeView {
  const continueContributions = contributions.filter((item) => item.operation === 'continue');
  const summaryContributions = contributions.filter((item) => item.operation === 'summary');

  const continueItems = continueContributions.flatMap(({ result }) => {
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
    : continueContributions.some(({ result }) => result.status === 'empty')
      ? { state: 'empty', providerId: null, title: null, updatedAt: null, href: null, progress: null }
      : bestUnavailable(continueContributions);

  const now: PrismNowItem[] = [];
  for (const { result } of summaryContributions) {
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
  return { continue: continueView, now: now.slice(0, 3) };
}
