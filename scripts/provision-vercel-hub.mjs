import { appendFileSync } from 'node:fs';

const API = 'https://api.vercel.com';

function asObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Vercel API returned an invalid object');
  }
  return value;
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
}

function apiError(action, response, body) {
  const value = asObject(body);
  const nested =
    value.error && typeof value.error === 'object' && !Array.isArray(value.error)
      ? value.error
      : {};
  const code = typeof nested.code === 'string' ? nested.code : undefined;
  const message =
    typeof nested.message === 'string'
      ? nested.message
      : typeof value.message === 'string'
        ? value.message
        : undefined;
  return new Error(
    `${action} failed with HTTP ${response.status}${code ? `: ${code}` : ''}${message ? ` — ${message}` : ''}`,
  );
}

async function api(fetchImpl, token, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  const response = await fetchImpl(`${API}${path}`, {
    ...init,
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  return { response, body: await readBody(response) };
}

export function validateProjectName(name) {
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(name)) {
    throw new Error('VERCEL_PROJECT_NAME is invalid');
  }
  return name;
}

function parseProject(body) {
  const value = asObject(body);
  if (typeof value.id !== 'string' || typeof value.name !== 'string') {
    throw new Error('Vercel API returned an invalid project');
  }
  return {
    id: value.id,
    name: value.name,
    linkedGit: Boolean(
      value.link && typeof value.link === 'object' && !Array.isArray(value.link),
    ),
  };
}

export async function ensureHubProject({
  token,
  projectName = 'thiepn-hub',
  fetchImpl = fetch,
}) {
  if (!token) throw new Error('VERCEL_TOKEN is required');
  validateProjectName(projectName);

  const lookup = await api(
    fetchImpl,
    token,
    `/v9/projects/${encodeURIComponent(projectName)}`,
    { method: 'GET' },
  );

  let project;
  let created = false;
  if (lookup.response.ok) {
    project = parseProject(lookup.body);
  } else if (lookup.response.status === 404) {
    const creation = await api(fetchImpl, token, '/v11/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        framework: 'astro',
        buildCommand: 'npm run build:enriched',
        installCommand: 'npm ci',
        outputDirectory: 'dist',
      }),
    });
    if (!creation.response.ok) {
      throw apiError('Vercel Hub project creation', creation.response, creation.body);
    }
    project = parseProject(creation.body);
    created = true;
  } else {
    throw apiError('Vercel Hub project lookup', lookup.response, lookup.body);
  }

  if (project.linkedGit) {
    throw new Error(
      'thiepn-hub is Git-linked; P3 requires manual CLI deployment only',
    );
  }

  return { project, created };
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, 'utf8');
  }
}

async function main() {
  const result = await ensureHubProject({
    token: process.env.VERCEL_TOKEN ?? '',
    projectName: process.env.VERCEL_PROJECT_NAME ?? 'thiepn-hub',
  });

  output('project-id', result.project.id);
  output('project-name', result.project.name);
  console.log(
    `Vercel Hub project ${result.created ? 'created' : 'reused'}: ${result.project.name} (${result.project.id})`,
  );
  console.log('Git integration: absent; deployment remains manual-only');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
