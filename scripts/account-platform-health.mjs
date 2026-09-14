import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_ATTEMPTS = 3;

export function classifyHttpStatus(status) {
  if (status === 0) return 'network';
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'service';
  if (status >= 400) return 'request';
  return 'healthy';
}

export function shouldRetryStatus(status) {
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function withRetry(operation, {
  attempts = DEFAULT_ATTEMPTS,
  baseDelayMs = 400,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await operation(attempt);
      if (!result?.retry || attempt === attempts) return result;
      lastError = result.error ?? new Error(`Retryable status ${result.status ?? 0}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
    await sleep(baseDelayMs * (2 ** (attempt - 1)));
  }
  throw lastError ?? new Error('Operation failed.');
}

function safeErrorName(error) {
  return error && typeof error === 'object' && typeof error.name === 'string'
    ? error.name
    : 'Error';
}

async function fetchAttempt(url, options = {}) {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      ...options,
      signal: options.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    return {
      response,
      status: response.status,
      latencyMs: Math.round(performance.now() - started),
      retry: shouldRetryStatus(response.status),
    };
  } catch (error) {
    return {
      response: null,
      status: 0,
      latencyMs: Math.round(performance.now() - started),
      retry: true,
      error,
      errorName: safeErrorName(error),
    };
  }
}

export async function probePage(target, options = {}) {
  const result = await withRetry(() => fetchAttempt(target.url), options);
  if (!result.response) {
    return {
      id: target.id,
      status: 'outage',
      category: 'network',
      httpStatus: 0,
      latencyMs: result.latencyMs,
      detail: result.errorName ?? 'NetworkError',
    };
  }

  const body = await result.response.text();
  const markerOk = body.toLowerCase().includes(String(target.expectedMarker).toLowerCase());
  const healthy = result.response.ok && markerOk;
  return {
    id: target.id,
    status: healthy ? 'healthy' : result.response.ok ? 'degraded' : 'outage',
    category: healthy ? 'healthy' : classifyHttpStatus(result.response.status),
    httpStatus: result.response.status,
    latencyMs: result.latencyMs,
    detail: healthy ? 'page-and-marker-ok' : markerOk ? 'http-failure' : 'marker-missing',
  };
}

export async function probeJsonApi(target, options = {}) {
  const result = await withRetry(() => fetchAttempt(target.url, {
    method: target.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(target.origin ? { Origin: target.origin } : {}),
    },
    body: target.body == null ? undefined : JSON.stringify(target.body),
  }), options);

  if (!result.response) {
    return {
      id: target.id,
      status: 'outage',
      category: 'network',
      httpStatus: 0,
      latencyMs: result.latencyMs,
      detail: result.errorName ?? 'NetworkError',
    };
  }

  let payload = null;
  try {
    payload = await result.response.json();
  } catch {
    // Invalid JSON is degraded even if the transport returned 2xx.
  }
  const contractOk = target.expectedOk === undefined || payload?.ok === target.expectedOk;
  const healthy = result.response.ok && contractOk;
  return {
    id: target.id,
    status: healthy ? 'healthy' : result.response.ok ? 'degraded' : 'outage',
    category: healthy ? 'healthy' : classifyHttpStatus(result.response.status),
    httpStatus: result.response.status,
    latencyMs: result.latencyMs,
    detail: healthy ? 'json-contract-ok' : result.response.ok ? 'json-contract-failure' : 'http-failure',
    requestId: result.response.headers.get('x-request-id'),
  };
}

export async function probePlatformHealth(url, options = {}) {
  const result = await withRetry(() => fetchAttempt(url, {
    headers: { Accept: 'application/json' },
  }), options);
  if (!result.response) {
    return {
      id: 'account-platform',
      status: 'outage',
      category: 'network',
      httpStatus: 0,
      latencyMs: result.latencyMs,
      detail: result.errorName ?? 'NetworkError',
    };
  }

  let payload = null;
  try {
    payload = await result.response.json();
  } catch {
    // A health endpoint returning invalid JSON is operationally unhealthy.
  }
  const endpointStatus = payload?.status;
  const healthy = result.response.ok && endpointStatus === 'healthy';
  return {
    id: 'account-platform',
    status: healthy ? 'healthy' : result.response.ok ? 'degraded' : 'outage',
    category: healthy ? 'healthy' : classifyHttpStatus(result.response.status),
    httpStatus: result.response.status,
    latencyMs: result.latencyMs,
    detail: payload?.checks ?? 'invalid-health-response',
    requestId: typeof payload?.requestId === 'string' ? payload.requestId : null,
  };
}

export function overallStatus(checks) {
  if (checks.some((check) => check.status === 'outage')) return 'outage';
  if (checks.some((check) => check.status !== 'healthy')) return 'degraded';
  return 'healthy';
}

export async function runHealth({ manifestPath = path.join(ROOT, 'ops/account-platform.json') } = {}) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const checks = [];
  checks.push(await probePlatformHealth(manifest.healthEndpoint));
  for (const consumer of manifest.consumers) checks.push(await probePage(consumer));
  for (const api of manifest.apiChecks ?? []) checks.push(await probeJsonApi(api));

  return {
    schemaVersion: 1,
    operationsVersion: manifest.operationsVersion,
    environment: manifest.environment,
    checkedAt: new Date().toISOString(),
    status: overallStatus(checks),
    checks,
  };
}

async function main() {
  const report = await runHealth();
  const artifactDir = path.join(ROOT, 'artifacts');
  await mkdir(artifactDir, { recursive: true });
  await writeFile(
    path.join(artifactDir, 'account-platform-health.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  console.log(`THIEPN Account Platform: ${report.status.toUpperCase()}`);
  for (const check of report.checks) {
    console.log(`- ${check.id}: ${check.status} (${check.httpStatus}, ${check.latencyMs} ms)`);
  }
  if (report.status !== 'healthy') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('THIEPN Account Platform health runner failed', {
      errorName: safeErrorName(error),
    });
    process.exitCode = 1;
  });
}
