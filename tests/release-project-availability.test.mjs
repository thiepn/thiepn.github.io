import test from 'node:test';
import assert from 'node:assert/strict';
import { auditProjectLaunchAvailability as audit } from '../scripts/lib/audit-project-availability.mjs';

const live = { code: 'L-008', slug: 'example', liveUrl: 'https://thiepn.dev/example/' };
const source = { ...live, visibility: 'listed' };
const offline = { ...live, liveUrl: null, unavailable: true };
const offlineSource = { ...source, liveUrl: undefined, unavailable: true };
const active = new Set([live.slug]);
const archive = new Set();

test('source release accepts a matching available HTTPS launch', () => {
  assert.deepEqual(audit(live, source, active), []);
});
test('source release accepts explicitly unavailable archive metadata', () => {
  assert.deepEqual(audit(offline, offlineSource, archive), []);
});
test('source release cannot suppress an active launch', () => {
  assert.match(audit(offline, offlineSource, active).join(' '), /active Hub launch/);
});
test('source release rejects missing or unsafe available URLs', () => {
  for (const value of [null, '', 'http://thiepn.dev/example/', 'https://user:secret@thiepn.dev/']) {
    assert.notEqual(audit({...live, liveUrl: value}, {...source, liveUrl: value}, active).length, 0);
  }
});
test('source release rejects an unavailable record that still advertises a URL', () => {
  assert.notEqual(audit({...offline, liveUrl: live.liveUrl}, offlineSource, archive).length, 0);
  assert.notEqual(audit(offline, {...offlineSource, liveUrl: live.liveUrl}, archive).length, 0);
});
test('source release rejects availability drift, source mismatch, and invalid flags', () => {
  assert.notEqual(audit(offline, source, archive).length, 0);
  assert.notEqual(audit(live, offlineSource, archive).length, 0);
  assert.notEqual(audit(live, undefined, archive).length, 0);
  assert.notEqual(audit({...live, unavailable:'true'}, source, archive).length, 0);
});
