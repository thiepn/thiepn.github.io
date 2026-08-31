import { describe, expect, it } from 'vitest';
import { buildStructuredGraph } from '../../src/lib/structured-data';

const graph = (value: Record<string, unknown>) => value['@graph'] as Array<Record<string, unknown>>;
const nodeByType = (value: Record<string, unknown>, type: string) => graph(value).find((node) => node['@type'] === type);

const browserGames = {
  slug: 'browser-games',
  title: 'Browser Games',
  summary: 'A collection of browser games built for direct play and replayable interaction.',
  keywords: ['browser games', 'interaction'],
  type: 'theme',
  projects: ['wordstrike', 'micro-arcade'],
};

describe('structured route semantics', () => {
  it('models a collection record as a CollectionPage with a Collection main entity', () => {
    const url = 'https://thiepn.dev/collection/browser-games/';
    const data = buildStructuredGraph({
      url,
      title: 'Browser Games — THIEPN',
      description: browserGames.summary,
      collection: browserGames,
    });

    const page = nodeByType(data, 'CollectionPage');
    const collection = nodeByType(data, 'Collection');
    expect(page?.mainEntity).toEqual({ '@id': `${url}#collection` });
    expect(collection?.collectionSize).toBe(2);
    expect(collection?.mainEntityOfPage).toEqual({ '@id': `${url}#webpage` });
    expect(collection?.hasPart).toEqual([
      { '@id': 'https://thiepn.dev/project/wordstrike/#project' },
      { '@id': 'https://thiepn.dev/project/micro-arcade/#project' },
    ]);
  });

  it('models the collections directory as a CollectionPage with an ItemList', () => {
    const url = 'https://thiepn.dev/collections/';
    const data = buildStructuredGraph({
      url,
      title: 'Collections — THIEPN',
      description: 'Browse THIEPN project collections.',
      collections: [
        browserGames,
        { ...browserGames, slug: 'typing-games', title: 'Typing Games', projects: ['wordstrike'] },
      ],
    });

    const page = nodeByType(data, 'CollectionPage');
    const list = nodeByType(data, 'ItemList');
    const collections = graph(data).filter((node) => node['@type'] === 'Collection');
    expect(page?.mainEntity).toEqual({ '@id': `${url}#collections` });
    expect(list?.numberOfItems).toBe(2);
    expect(collections).toHaveLength(2);
  });

  it('uses the dedicated AboutPage type for the About route', () => {
    const data = buildStructuredGraph({
      url: 'https://thiepn.dev/about/',
      title: 'About — THIEPN',
      description: 'About THIEPN.',
      pageType: 'AboutPage',
    });

    expect(nodeByType(data, 'AboutPage')).toBeTruthy();
    expect(nodeByType(data, 'WebPage')).toBeUndefined();
  });
});
