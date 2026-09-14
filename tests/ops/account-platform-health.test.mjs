import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyHttpStatus,
  overallStatus,
  probeJsonApi,
  shouldRetryStatus,
  withRetry,
} from '../../scripts/account-platform-health.mjs';

test('A7 classifies operational HTTP states without conflating auth and network failures', () => {
  assert.equal(classifyHttpStatus(0), 'network');
  assert.equal(classifyHttpStatus(401), 'authentication');
  assert.equal(classifyHttpStatus(403), 'authorization');
  assert.equal(classifyHttpStatus(429), 'rate_limit');
  assert.equal(classifyHttpStatus(503), 'service');
  assert.equal(classifyHttpStatus(400), 'request');
  assert.equal(classifyHttpStatus(204), 'healthy');
});

test('A7 only retries transient classes', () => {
  for (const status of [0, 408, 425, 429, 500, 503]) assert.equal(shouldRetryStatus(status), true);
  for (const status of [200, 400, 401, 403, 404, 422]) assert.equal(shouldRetryStatus(status), false);
});

test('A7 retry helper is bounded and succeeds after a transient result', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    return calls < 3 ? { retry: true, status: 503 } : { retry: false, status: 200 };
  }, { attempts: 3, baseDelayMs: 0, sleep: async () => {} });
  assert.equal(calls, 3);
  assert.equal(result.status, 200);
});

test('A7 retry helper does not exceed its configured bound', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    return { retry: true, status: 503 };
  }, { attempts: 3, baseDelayMs: 0, sleep: async () => {} });
  assert.equal(calls, 3);
  assert.equal(result.status, 503);
});

test('A7 JSON API probe validates response contract and captures only request correlation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Origin, 'https://thiepn.dev');
    return new Response(JSON.stringify({ ok: true, data: { privateLookingPayload: 'not-retained' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'probe-test-1234' },
    });
  };
  try {
    const result = await probeJsonApi({
      id: 'api',
      url: 'https://example.invalid/api',
      method: 'POST',
      origin: 'https://thiepn.dev',
      body: { boardKey: 'endless-v1' },
      expectedOk: true,
    }, { attempts: 1, baseDelayMs: 0, sleep: async () => {} });
    assert.deepEqual(result, {
      id: 'api',
      status: 'healthy',
      category: 'healthy',
      httpStatus: 200,
      latencyMs: result.latencyMs,
      detail: 'json-contract-ok',
      requestId: 'probe-test-1234',
    });
    assert.equal('payload' in result, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('A7 overall health distinguishes degraded and outage states', () => {
  assert.equal(overallStatus([{ status: 'healthy' }, { status: 'healthy' }]), 'healthy');
  assert.equal(overallStatus([{ status: 'healthy' }, { status: 'degraded' }]), 'degraded');
  assert.equal(overallStatus([{ status: 'degraded' }, { status: 'outage' }]), 'outage');
});
