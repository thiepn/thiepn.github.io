# Privacy-conscious analytics

THIEPN supports Cloudflare Web Analytics as an optional, privacy-conscious production integration.

## Design contract

- Analytics is disabled unless `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is present during a production build.
- Development/noindex routes are excluded.
- The runtime loader exits before requesting Cloudflare when Global Privacy Control or Do Not Track opts out.
- URLs with a query string or fragment are excluded so archive/search/filter state is not sent as the landing URL.
- The site uses `strict-origin` referrer policy.
- No THIEPN custom analytics events are sent.
- The integration does not create analytics cookies or use `localStorage`, `sessionStorage`, or a persistent user ID.

## Production configuration

1. In Cloudflare Web Analytics, add `thiepn.dev` as a site and copy its site token.
2. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables**.
3. Create a repository variable named `CLOUDFLARE_WEB_ANALYTICS_TOKEN` containing the Cloudflare site token.
4. Redeploy the GitHub Pages workflow. The workflow maps that repository variable to `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` for Astro's production build.
5. Verify `/privacy/` reports analytics as configured and inspect the rendered page for the Cloudflare beacon only on clean, indexable `thiepn.dev` URLs without browser opt-out signals.

The Cloudflare site token is a public browser-side identifier, not an API credential. Do not place Cloudflare API tokens or account secrets in this variable.

## Provider references

- https://developers.cloudflare.com/web-analytics/about/
- https://developers.cloudflare.com/web-analytics/get-started/
- https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/
- https://developers.cloudflare.com/speed/observatory/rum-beacon/
