/**
 * EPUB Data Types and Structures
 */

export interface EpubTocItem {
  id: string;
  title: string;
  href: string; // Relative path in archive
  subItems?: EpubTocItem[];
}

export interface EpubMetadata {
  title: string;
  creator?: string;
  language?: string;
  publisher?: string;
  publicationDate?: string;
  identifier?: string;
  description?: string;
  subjects?: string[];
  coverHref?: string;
}

export interface EpubManifestItem {
  id: string;
  href: string;
  mediaType: string;
}

export interface EpubSpineItem {
  idref: string;
  linear?: boolean;
}

export interface EpubParsedBook {
  metadata: EpubMetadata;
  toc: EpubTocItem[];
  spine: string[]; // List of hrefs in reading order
  manifest: Record<string, EpubManifestItem>;
  isDrmProtected: boolean;
  coverDataUrl?: string;
  totalChapters: number;
}

export interface EpubChapterContent {
  chapterIndex: number;
  href: string;
  title?: string;
  sanitizedHtml: string;
}
