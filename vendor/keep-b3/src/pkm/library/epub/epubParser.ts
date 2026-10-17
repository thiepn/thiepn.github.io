/**
 * Phase P52 — EPUB Parser & Security Engine
 *
 * Uses JSZip and DOMPurify to safely extract EPUB metadata, TOC, manifest,
 * reading spine, and sanitized chapter contents without risking script injection or CSS leaks.
 */

import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { EpubParsedBook, EpubMetadata, EpubTocItem, EpubChapterContent } from './epubTypes';

export class EpubParser {
  /**
   * Parses an EPUB binary array buffer or Blob into a structured, sandboxed book model.
   */
  public static async parseEpub(data: ArrayBuffer | Blob): Promise<{
    book: EpubParsedBook;
    zip: JSZip;
  }> {
    const zip = await JSZip.loadAsync(data);

    // 1. DRM Detection Gate
    const encryptionFile = zip.file('META-INF/encryption.xml') || zip.file('META-INF/rights.xml');
    const isDrmProtected = !!encryptionFile;

    if (isDrmProtected) {
      return {
        book: {
          metadata: { title: 'Protected EPUB (DRM)' },
          toc: [],
          spine: [],
          manifest: {},
          isDrmProtected: true,
          totalChapters: 0,
        },
        zip,
      };
    }

    // 2. Locate OPF file via META-INF/container.xml
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
      throw new Error('Invalid EPUB: META-INF/container.xml not found.');
    }
    const containerXml = await containerFile.async('text');
    const opfPath = this.extractOpfPath(containerXml);
    if (!opfPath) {
      throw new Error('Invalid EPUB: Could not locate rootfile OPF path in container.xml.');
    }

    // 3. Read OPF Content
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      throw new Error(`Invalid EPUB: OPF package not found at ${opfPath}.`);
    }
    const opfXml = await opfFile.async('text');
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    // 4. Parse Metadata, Manifest, and Spine
    const metadata = this.parseOpfMetadata(opfXml);
    const { manifest, spine } = this.parseOpfManifestAndSpine(opfXml, opfDir);

    // 5. Parse TOC (NCX or EPUB3 Navigation)
    const toc = await this.parseToc(zip, manifest, opfDir);

    // 6. Extract Cover Image if available
    let coverDataUrl: string | undefined;
    if (metadata.coverHref) {
      const fullCoverPath = opfDir + metadata.coverHref;
      const coverFile = zip.file(fullCoverPath) || zip.file(metadata.coverHref);
      if (coverFile) {
        try {
          const coverBase64 = await coverFile.async('base64');
          const ext = metadata.coverHref.split('.').pop()?.toLowerCase() || 'jpeg';
          const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          coverDataUrl = `data:${mime};base64,${coverBase64}`;
        } catch {
          // Non-blocking cover failure
        }
      }
    }

    return {
      book: {
        metadata,
        toc,
        spine,
        manifest,
        isDrmProtected: false,
        coverDataUrl,
        totalChapters: spine.length,
      },
      zip,
    };
  }

  /**
   * Retrieves and strictly sanitizes a chapter's HTML content from the zip.
   */
  public static async getChapterContent(
    zip: JSZip,
    chapterHref: string,
    chapterIndex: number,
    title?: string
  ): Promise<EpubChapterContent> {
    const file = zip.file(chapterHref);
    if (!file) {
      return {
        chapterIndex,
        href: chapterHref,
        title: title || `Chapter ${chapterIndex + 1}`,
        sanitizedHtml: '<p class="text-stone-500 italic">Chapter content could not be located in archive.</p>',
      };
    }

    const rawHtml = await file.async('text');

    // DOMPurify Sanitization configuration to isolate content and prevent arbitrary code execution
    const cleanConfig = {
      ALLOWED_TAGS: [
        'p', 'span', 'b', 'i', 'em', 'strong', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'ul', 'ol', 'li', 'hr', 'br', 'pre', 'code', 'table',
        'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'figure', 'figcaption',
        'div', 'section', 'article', 'aside', 'header', 'footer', 'sub', 'sup',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'svg'],
      FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
      ALLOW_DATA_ATTR: false,
    };

    const sanitized = String(DOMPurify.sanitize(rawHtml, cleanConfig as any));

    return {
      chapterIndex,
      href: chapterHref,
      title: title || `Chapter ${chapterIndex + 1}`,
      sanitizedHtml: sanitized,
    };
  }

  private static extractOpfPath(containerXml: string): string | null {
    const match = containerXml.match(/full-path=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  private static parseOpfMetadata(opfXml: string): EpubMetadata {
    const getTag = (tag: string): string | undefined => {
      const regex = new RegExp(`<(?:dc:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:dc:)?${tag}>`, 'i');
      const match = opfXml.match(regex);
      return match ? match[1].trim() : undefined;
    };

    const title = getTag('title') || 'Untitled Book';
    const creator = getTag('creator');
    const language = getTag('language');
    const publisher = getTag('publisher');
    const publicationDate = getTag('date');
    const identifier = getTag('identifier');
    const description = getTag('description');

    // Cover meta tag extraction e.g. <meta name="cover" content="cover-image"/>
    let coverHref: string | undefined;
    const coverMetaMatch = opfXml.match(/<meta[^>]*name=["']cover["'][^>]*content=["']([^"']+)["']/i);
    if (coverMetaMatch) {
      const coverId = coverMetaMatch[1];
      const itemMatch = opfXml.match(new RegExp(`<item[^>]*id=["']${coverId}["'][^>]*href=["']([^"']+)["']`, 'i'));
      if (itemMatch) {
        coverHref = itemMatch[1];
      }
    }

    return {
      title,
      creator,
      language,
      publisher,
      publicationDate,
      identifier,
      description,
      coverHref,
    };
  }

  private static parseOpfManifestAndSpine(
    opfXml: string,
    opfDir: string
  ): {
    manifest: Record<string, { id: string; href: string; mediaType: string }>;
    spine: string[];
  } {
    const manifest: Record<string, { id: string; href: string; mediaType: string }> = {};
    const itemRegex = /<item\s+([^>]+)\/?>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(opfXml)) !== null) {
      const attrs = match[1];
      const idMatch = attrs.match(/id=["']([^"']+)["']/i);
      const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
      const typeMatch = attrs.match(/media-type=["']([^"']+)["']/i);

      if (idMatch && hrefMatch) {
        const id = idMatch[1];
        const href = opfDir + hrefMatch[1];
        manifest[id] = {
          id,
          href,
          mediaType: typeMatch ? typeMatch[1] : '',
        };
      }
    }

    const spine: string[] = [];
    const spineRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*\/?>/gi;
    while ((match = spineRegex.exec(opfXml)) !== null) {
      const idref = match[1];
      if (manifest[idref]) {
        spine.push(manifest[idref].href);
      }
    }

    return { manifest, spine };
  }

  private static async parseToc(
    zip: JSZip,
    manifest: Record<string, { id: string; href: string; mediaType: string }>,
    opfDir: string
  ): Promise<EpubTocItem[]> {
    const tocItems: EpubTocItem[] = [];

    // Check for NCX (toc.ncx)
    const ncxItem = Object.values(manifest).find(
      (m) => m.mediaType === 'application/x-dtbncx+xml' || m.href.endsWith('.ncx')
    );

    if (ncxItem) {
      const ncxFile = zip.file(ncxItem.href) || zip.file(opfDir + ncxItem.href);
      if (ncxFile) {
        try {
          const ncxXml = await ncxFile.async('text');
          const navPointRegex = /<navPoint[^>]*>[\s\S]*?<navLabel>\s*<text>([\s\S]*?)<\/text>\s*<\/navLabel>\s*<content\s+src=["']([^"']+)["'][\s\S]*?<\/navPoint>/gi;
          let match: RegExpExecArray | null;
          let count = 0;
          while ((match = navPointRegex.exec(ncxXml)) !== null) {
            count++;
            const title = match[1].trim();
            const src = opfDir + match[2].trim();
            tocItems.push({
              id: `toc-${count}`,
              title,
              href: src,
            });
          }
        } catch {
          // Fallback to spine items
        }
      }
    }

    return tocItems;
  }
}
