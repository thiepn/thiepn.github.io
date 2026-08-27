import { describe, expect, it } from 'vitest';
import { analyticsBuildEligible, analyticsLoaderSource } from '../../src/lib/analytics-policy';

describe('privacy analytics policy', () => {
  it('fails closed unless a production token is configured', () => {
    expect(analyticsBuildEligible({ token: '', production: true, noindex: false, pathname: '/' })).toBe(false);
    expect(analyticsBuildEligible({ token: 'token', production: false, noindex: false, pathname: '/' })).toBe(false);
    expect(analyticsBuildEligible({ token: 'token', production: true, noindex: true, pathname: '/' })).toBe(false);
    expect(analyticsBuildEligible({ token: 'token', production: true, noindex: false, pathname: '/dev/catalogue/' })).toBe(false);
    expect(analyticsBuildEligible({ token: ' token ', production: true, noindex: false, pathname: '/projects/' })).toBe(true);
  });

  it('generates a guarded Cloudflare loader with no analytics storage or custom events', () => {
    const source = analyticsLoaderSource(' public-token ');
    expect(source).toContain("window.location.hostname!=='thiepn.dev'");
    expect(source).toContain('globalPrivacyControl');
    expect(source).toContain('doNotTrack');
    expect(source).toContain('window.location.search');
    expect(source).toContain('window.location.hash');
    expect(source).toContain('https://static.cloudflareinsights.com/beacon.min.js');
    expect(source).toContain('spa:false');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
    expect(source).not.toContain('document.cookie');
    expect(source).not.toContain('trackEvent');
  });
});
