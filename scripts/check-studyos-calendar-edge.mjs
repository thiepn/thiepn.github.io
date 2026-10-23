/** Unauthenticated public-origin contract check; never sends tokens or personal data. */
const endpoint = 'https://study.thiepn.dev/api/hub/calendar/v1/events?from='
  + new Date().toISOString().slice(0, 10) + '&days=7';
const hubOrigin = 'https://thiepn.dev';
const otherOrigin = 'https://untrusted.example';
const attempt = async (method, origin, headers = {}) => {
  const response = await fetch(endpoint, {
    method, headers: { Origin: origin, ...headers },
    redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const cors = response.headers.get('access-control-allow-origin');
  console.log(method + ' ' + (origin === hubOrigin ? 'Hub' : 'other') +
    ' status=' + response.status + ' cors=' +
    (cors === hubOrigin ? 'Hub' : cors === null ? 'none' : 'unexpected'));
  return response;
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
try {
  const preflight = await attempt('OPTIONS', hubOrigin, {
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'authorization',
  });
  assert(preflight.status === 204 &&
    preflight.headers.get('access-control-allow-origin') === hubOrigin &&
    /authorization/i.test(preflight.headers.get('access-control-allow-headers') || ''),
    'StudyOS Calendar preflight does not authorize Hub bearer requests');
  const unauthenticated = await attempt('GET', hubOrigin, { Accept: 'application/json' });
  assert(unauthenticated.status === 401 &&
    unauthenticated.headers.get('access-control-allow-origin') === hubOrigin,
    'StudyOS must reject missing bearer with a CORS-enabled 401');
  const blockedPreflight = await attempt('OPTIONS', otherOrigin, {
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'authorization',
  });
  assert(blockedPreflight.status === 403 &&
    !blockedPreflight.headers.has('access-control-allow-origin'),
    'StudyOS must not approve unknown-origin bearer preflight');
  const blockedGet = await attempt('GET', otherOrigin, { Accept: 'application/json' });
  assert(blockedGet.status === 403 &&
    !blockedGet.headers.has('access-control-allow-origin'),
    'StudyOS must not expose calendar responses to unknown origins');
  for (const response of [preflight, unauthenticated, blockedPreflight, blockedGet])
    assert(response.headers.get('cache-control')?.includes('no-store') &&
      response.headers.get('vary')?.toLowerCase().split(',').map(s => s.trim()).includes('origin'),
      'Calendar transport must remain uncached and vary by Origin');
  console.log('StudyOS calendar public transport and origin isolation verified; signed owner access remains untested.');
} catch (err) {
  console.error('StudyOS public transport failed:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
