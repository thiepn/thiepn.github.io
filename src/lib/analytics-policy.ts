export interface AnalyticsBuildPolicyInput {
  token?: string | null;
  production: boolean;
  noindex: boolean;
  pathname: string;
}

export function analyticsBuildEligible({ token, production, noindex, pathname }: AnalyticsBuildPolicyInput): boolean {
  return Boolean(token?.trim())
    && production
    && !noindex
    && !pathname.startsWith('/dev/');
}

export function analyticsLoaderSource(token: string): string {
  const encodedToken = JSON.stringify(token.trim()).replace(/</g, '\\u003c');
  return `(()=>{const token=${encodedToken};const nav=navigator;const dnt=nav.doNotTrack==='1'||window.doNotTrack==='1';const gpc=nav.globalPrivacyControl===true;const privateUrl=window.location.search.length>0||window.location.hash.length>0;if(window.location.hostname!=='thiepn.dev'||dnt||gpc||privateUrl)return;const beacon=document.createElement('script');beacon.type='module';beacon.src='https://static.cloudflareinsights.com/beacon.min.js';beacon.dataset.cfBeacon=JSON.stringify({token,spa:false});beacon.dataset.thiepnAnalytics='cloudflare-web-analytics';document.head.appendChild(beacon);})();`;
}
