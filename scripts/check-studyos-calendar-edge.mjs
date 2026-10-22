/** Public-origin connectivity contract. Never sends credentials or user data. */
const endpoint = 'https://study.thiepn.dev/api/hub/calendar/v1/events?from=2026-10-22&days=7';
const origin = 'https://thiepn.dev';
const attempt = async (method, headers) => {
  const response = await fetch(endpoint, {
    method, headers, redirect: 'manual', cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  });
  const cors = response.headers.get('access-control-allow-origin');
  const contentType = response.headers.get('content-type') || '';
  console.log(method + ' endpoint status=' + response.status + ' cors=' + (cors === origin ? 'allowed' : 'missing') +
    ' content=' + contentType.split(';')[0]);
  return response;
};
try {
  const preflight = await attempt('OPTIONS', {
    Origin:origin, 'Access-Control-Request-Method':'GET',
    'Access-Control-Request-Headers':'authorization'
  });
  if(preflight.status !== 204 || preflight.headers.get('access-control-allow-origin') !== origin ||
     !/authorization/i.test(preflight.headers.get('access-control-allow-headers') || ''))
    throw new Error('StudyOS Calendar preflight does not permit signed Hub requests');
  const unauthenticated = await attempt('GET', {Origin:origin,Accept:'application/json'});
  if(unauthenticated.status !== 401 || unauthenticated.headers.get('access-control-allow-origin') !== origin)
    throw new Error('StudyOS Calendar endpoint must reject missing bearer token with CORS-enabled 401');
  console.log('StudyOS Hub cross-origin transport is reachable; signed Account and source queries require separate qualification.');
} catch(err) {
  console.error('StudyOS public transport failed:',err instanceof Error ? err.message : String(err));
  process.exitCode=1;
}
