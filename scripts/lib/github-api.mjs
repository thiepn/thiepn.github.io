const API_VERSION = '2026-03-10';
const API_ROOT = 'https://api.github.com';

export function githubHeaders(token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'thiepn-index-automation',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function githubJson(url, { token, timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: githubHeaders(token), signal: controller.signal });
    if (!response.ok) {
      const retryAfter = response.headers.get('retry-after');
      const remaining = response.headers.get('x-ratelimit-remaining');
      const detail = retryAfter ? ` retry-after=${retryAfter}s` : remaining === '0' ? ' rate-limit-exhausted' : '';
      throw new Error(`GitHub ${response.status} ${response.statusText}:${detail}`);
    }
    return { data: await response.json(), headers: response.headers };
  } finally {
    clearTimeout(timer);
  }
}

export async function listUserRepos(owner, { token, fixture } = {}) {
  if (fixture) return fixture;
  const results = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = `${API_ROOT}/users/${encodeURIComponent(owner)}/repos?per_page=100&page=${page}&type=owner&sort=updated`;
    const { data } = await githubJson(url, { token });
    if (!Array.isArray(data)) throw new Error('Unexpected GitHub repository response.');
    results.push(...data);
    if (data.length < 100) break;
  }
  return results;
}

export async function getRepository(repo, { token, fixture } = {}) {
  if (fixture) return fixture;
  const { data } = await githubJson(`${API_ROOT}/repos/${repo}`, { token });
  return data;
}

export function normalizeRepository(repo) {
  return {
    repo: repo.full_name,
    name: repo.name,
    exists: true,
    archived: Boolean(repo.archived),
    disabled: Boolean(repo.disabled),
    private: Boolean(repo.private),
    defaultBranch: repo.default_branch ?? null,
    language: repo.language ?? null,
    pushedAt: repo.pushed_at ?? null,
    updatedAt: repo.updated_at ?? null,
    createdAt: repo.created_at ?? null,
    homepage: repo.homepage || null,
    hasPages: Boolean(repo.has_pages),
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    sizeKb: Number.isFinite(repo.size) ? repo.size : null,
    stars: Number.isFinite(repo.stargazers_count) ? repo.stargazers_count : null,
    visibility: repo.visibility ?? (repo.private ? 'private' : 'public'),
  };
}
