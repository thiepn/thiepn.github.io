import { SITE } from '../data/site';

export type JsonLdNode = Record<string, unknown>;

interface StructuredProject {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  category: string;
  type: string;
  status: string;
  repo?: string | null | undefined;
  liveUrl?: string | null | undefined;
  dateAdded: Date;
  dateUpdated?: Date | undefined;
  lastMajorUpdate?: Date | undefined;
  platforms: string[];
  tags: string[];
  showcase?: { release?: string | undefined } | undefined;
}

interface StructuredBook {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  version: string;
  editionLabel: string;
  firstPublished: Date;
  lastUpdated: Date;
  libraryUrl: string;
  coverUrl: string;
  formats: string[];
  subjects: string[];
}

interface StructuredGraphInput {
  url: string;
  title: string;
  description: string;
  project?: StructuredProject | undefined;
  projects?: StructuredProject[] | undefined;
  books?: StructuredBook[] | undefined;
}

const websiteId = `${SITE.url}/#website`;
const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const titleCase = (value: string) => value.replace(/(^|-)([a-z])/g, (_, separator, letter) => `${separator ? ' ' : ''}${letter.toUpperCase()}`);
const projectUrl = (slug: string) => `${SITE.url}/project/${slug}/`;
const githubUrl = (repo?: string | null | undefined) => repo ? `https://github.com/${repo}` : null;
const formatMime = (format: string) => ({ web: 'text/html', pdf: 'application/pdf', epub: 'application/epub+zip' }[format] ?? format);

function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': websiteId,
    url: `${SITE.url}/`,
    name: SITE.name,
    alternateName: 'THIEPN Project Universe',
    description: SITE.description,
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/projects/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

function webPageNode(url: string, title: string, description: string, type = 'WebPage'): JsonLdNode {
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: { '@id': websiteId },
    inLanguage: 'en',
  };
}

function projectNode(project: StructuredProject, url: string): JsonLdNode {
  const modified = project.dateUpdated ?? project.lastMajorUpdate ?? project.dateAdded;
  const repository = githubUrl(project.repo);
  const sameAs = [project.liveUrl, repository].filter((value): value is string => Boolean(value));
  const workStatus = {
    live: 'Published',
    beta: 'In development',
    experiment: 'Experimental',
    archived: 'Archived',
  }[project.status] ?? project.status;
  const common: JsonLdNode = {
    '@id': `${url}#project`,
    name: project.title,
    alternateName: project.subtitle,
    description: project.summary,
    url,
    dateCreated: isoDate(project.dateAdded),
    dateModified: isoDate(modified),
    keywords: project.tags.join(', '),
    creativeWorkStatus: workStatus,
    isPartOf: { '@id': websiteId },
    mainEntityOfPage: { '@id': `${url}#webpage` },
    ...(sameAs.length ? { sameAs } : {}),
  };

  // Category is the canonical, singular portfolio classification. Game records may
  // use more specific product types such as `quiz`, so category is authoritative
  // for deciding whether schema.org should expose the work as a VideoGame.
  if (project.category === 'games') {
    return {
      '@type': 'VideoGame',
      ...common,
      gamePlatform: project.platforms.length ? project.platforms.map(titleCase) : ['Web browser'],
      genre: project.tags,
      ...(repository ? { codeRepository: repository } : {}),
    };
  }

  if (['resource', 'guide', 'book'].includes(project.type)) {
    return {
      '@type': 'CreativeWork',
      ...common,
      genre: titleCase(project.category),
    };
  }

  return {
    '@type': 'SoftwareApplication',
    ...common,
    applicationCategory: titleCase(project.category),
    operatingSystem: 'Web browser',
    ...(project.showcase?.release ? { softwareVersion: project.showcase.release } : {}),
    ...(repository ? { codeRepository: repository } : {}),
  };
}

function projectIndexNode(projects: StructuredProject[], url: string): JsonLdNode {
  return {
    '@type': 'ItemList',
    '@id': `${url}#projects`,
    name: 'THIEPN projects',
    numberOfItems: projects.length,
    itemListElement: projects.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: project.title,
      url: projectUrl(project.slug),
    })),
  };
}

function bookNode(book: StructuredBook): JsonLdNode {
  return {
    '@type': 'Book',
    '@id': `${book.libraryUrl}#book`,
    url: book.libraryUrl,
    name: book.title,
    alternateName: book.subtitle,
    description: book.summary,
    image: book.coverUrl,
    datePublished: isoDate(book.firstPublished),
    dateModified: isoDate(book.lastUpdated),
    bookEdition: book.editionLabel,
    encodingFormat: book.formats.map(formatMime),
    keywords: book.subjects.join(', '),
  };
}

function booksIndexNode(books: StructuredBook[], url: string): JsonLdNode {
  return {
    '@type': 'ItemList',
    '@id': `${url}#books`,
    name: 'Published THIEPN books',
    numberOfItems: books.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: books.map((book, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: { '@id': `${book.libraryUrl}#book` },
    })),
  };
}

export function buildStructuredGraph(input: StructuredGraphInput): JsonLdNode {
  const collectionPage = Boolean(input.projects || input.books);
  const page = webPageNode(input.url, input.title, input.description, collectionPage ? 'CollectionPage' : 'WebPage');
  const graph: JsonLdNode[] = [websiteNode(), page];

  if (input.project) {
    const entity = projectNode(input.project, input.url);
    page.mainEntity = { '@id': entity['@id'] };
    graph.push(entity);
  } else if (input.projects) {
    const list = projectIndexNode(input.projects, input.url);
    page.mainEntity = { '@id': list['@id'] };
    graph.push(list);
  } else if (input.books) {
    const list = booksIndexNode(input.books, input.url);
    page.mainEntity = { '@id': list['@id'] };
    graph.push(list, ...input.books.map(bookNode));
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function serializeStructuredData(value: JsonLdNode): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
