import { describe, expect, it } from 'vitest';
import projection from '../../src/data/runtime-ownership-p11.json';
import products from '../../src/data/products-v2.json';

describe('P11 Hub runtime ownership', () => {
  it('has no dependency on the retired shared runtime', () => {
    expect(projection.sharedNodeRuntime.dependency).toBe(false);
    expect(projection.sharedNodeRuntime.project).toBeNull();
    expect(projection.sharedNodeRuntime.domain).toBeNull();
    expect(projection.sharedNodeRuntime.retiredProjectName).toBe(
      'thiepn-platform',
    );
    expect(projection.sharedNodeRuntime.retiredDomain).toBe(
      'platform.thiepn.dev',
    );
  });

  it('keeps Hub aggregation product-owned', () => {
    expect(projection.hubRuntime.ownerRepo).toBe('thiepn/thiepn.github.io');
    expect(projection.hubRuntime.vercelProject).toBe('thiepn-hub');
    expect(projection.hubRuntime.productOwned).toBe(true);
    expect(projection.rules.routeHubAggregationThroughHubRuntime).toBe(true);
  });

  it('does not expose a Platform product or retired domain', () => {
    expect(products.products.some((product) => product.id === 'platform')).toBe(
      false,
    );
    const urls = products.products.flatMap((product) => [
      product.launchUrl,
      ...product.modules.map((module) => module.launchUrl),
    ]);
    expect(
      urls.some((url) => url?.includes('platform.thiepn.dev')),
    ).toBe(false);
  });
});
