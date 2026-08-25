export interface SearchableProject {
  kind: 'project';
  code: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  aliases: readonly string[];
  category: string;
  status: string;
  tags: readonly string[];
  collections: readonly string[];
  capabilityTags?: readonly string[];
  platforms?: readonly string[];
  repo?: string | null;
  liveUrl?: string | null;
  primaryLabel?: string | null;
  accentLight: string;
  accentDark: string;
  updatedAt?: string | null;
}

export interface SearchableCollection {
  kind: 'collection';
  code: string;
  slug: string;
  title: string;
  summary: string;
  editorialNote?: string;
  projects: readonly string[];
  projectTitles?: readonly string[];
  keywords?: readonly string[];
  relationshipLabels?: readonly string[];
}

export type SearchableItem = SearchableProject | SearchableCollection;

export interface RankedSearchResult<T extends SearchableItem = SearchableItem> {
  item: T;
  score: number;
}

const normalize = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('en')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function tokenDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1]! + 1,
        previous[j]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j]!;
  }
  return previous[b.length]!;
}

function fuzzyTokenScore(query: string, candidate: string): number {
  if (query.length < 3 || candidate.length < 3) return 0;
  const distance = tokenDistance(query, candidate);
  const threshold = query.length <= 5 ? 1 : 2;
  if (distance > threshold) return 0;
  return Math.max(8, 28 - distance * 8);
}

function scoreField(query: string, value: string, weights: { exact: number; prefix: number; token: number; fuzzy?: number }): number {
  const normalized = normalize(value);
  if (!normalized) return 0;
  if (normalized === query) return weights.exact;
  if (normalized.startsWith(query)) return weights.prefix;
  const tokens = normalized.split(' ');
  if (tokens.some((token) => token === query)) return weights.token;
  if (normalized.includes(query)) return Math.max(1, weights.token - 8);
  if (weights.fuzzy) {
    return Math.max(...tokens.map((token) => fuzzyTokenScore(query, token)), 0) * (weights.fuzzy / 28);
  }
  return 0;
}

export function scoreSearchItem(item: SearchableItem, rawQuery: string): number {
  const query = normalize(rawQuery);
  if (!query) return 0;

  let score = 0;
  score = Math.max(score, scoreField(query, item.title, { exact: 100, prefix: 85, token: 70, fuzzy: 28 }));
  score = Math.max(score, scoreField(query, item.code, { exact: 95, prefix: 82, token: 70, fuzzy: 20 }));

  if (item.kind === 'project') {
    for (const alias of item.aliases) score = Math.max(score, scoreField(query, alias, { exact: 65, prefix: 58, token: 55, fuzzy: 24 }));
    for (const tag of item.tags) score = Math.max(score, scoreField(query, tag, { exact: 40, prefix: 38, token: 36, fuzzy: 18 }));
    score = Math.max(score, scoreField(query, item.category, { exact: 38, prefix: 35, token: 32 }));
    for (const collection of item.collections) score = Math.max(score, scoreField(query, collection, { exact: 35, prefix: 32, token: 28 }));
    for (const capability of item.capabilityTags ?? []) score = Math.max(score, scoreField(query, capability, { exact: 40, prefix: 36, token: 34, fuzzy: 16 }));
    for (const platform of item.platforms ?? []) score = Math.max(score, scoreField(query, platform, { exact: 28, prefix: 26, token: 24 }));
    if (item.repo) score = Math.max(score, scoreField(query, item.repo, { exact: 46, prefix: 42, token: 38, fuzzy: 18 }));
    score = Math.max(score, scoreField(query, item.subtitle, { exact: 32, prefix: 30, token: 26, fuzzy: 16 }));
    score = Math.max(score, scoreField(query, item.summary, { exact: 22, prefix: 20, token: 20 }));
  } else {
    score = Math.max(score, scoreField(query, item.summary, { exact: 32, prefix: 28, token: 22, fuzzy: 14 }));
    if (item.editorialNote) score = Math.max(score, scoreField(query, item.editorialNote, { exact: 28, prefix: 25, token: 20, fuzzy: 12 }));
    for (const keyword of item.keywords ?? []) score = Math.max(score, scoreField(query, keyword, { exact: 50, prefix: 44, token: 40, fuzzy: 20 }));
    for (const title of item.projectTitles ?? []) score = Math.max(score, scoreField(query, title, { exact: 42, prefix: 38, token: 34, fuzzy: 16 }));
    for (const relation of item.relationshipLabels ?? []) score = Math.max(score, scoreField(query, relation, { exact: 46, prefix: 42, token: 36, fuzzy: 18 }));
  }

  return Math.round(score * 100) / 100;
}

export function searchCatalogue<T extends SearchableItem>(items: readonly T[], query: string, limit = 20): RankedSearchResult<T>[] {
  if (!normalize(query)) return [];
  return items
    .map((item) => ({ item, score: scoreSearchItem(item, query) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit);
}

export function matchesProjectQuery(project: SearchableProject, query: string): boolean {
  return !normalize(query) || scoreSearchItem(project, query) > 0;
}

export function normalizeSearchQuery(value: string): string {
  return normalize(value);
}
