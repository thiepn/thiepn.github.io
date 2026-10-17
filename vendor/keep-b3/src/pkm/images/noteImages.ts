import { NoteImage } from '../../types';

export interface NoteEmbeddedImage {
  id: string;
  url: string;
  alt: string;
  index: number;
  sourceType: 'markdown' | 'attachment' | 'camera' | 'html';
  fullTag?: string;
  byteSize?: number;
  fileName?: string;
}

/**
 * Checks whether an image URL is a base64 Data URL (e.g. from camera capture)
 */
export function isDataUrl(url: string): boolean {
  return typeof url === 'string' && url.trim().startsWith('data:image/');
}

/**
 * Formats a byte size into a human-readable string (e.g. "1.2 MB", "450 KB")
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract all images embedded in a note's markdown body and attachments.
 * Aggregates markdown images `![alt](url)`, HTML `<img src="..." alt="...">`, and `note.images`.
 */
export function extractNoteImages(
  content: string = '',
  attachedImages: NoteImage[] = []
): NoteEmbeddedImage[] {
  const results: NoteEmbeddedImage[] = [];
  const seenUrls = new Set<string>();

  if (content) {
    // 1. Match markdown images: ![alt](url)
    const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let mdMatch: RegExpExecArray | null;
    let counter = 0;

    while ((mdMatch = mdRegex.exec(content)) !== null) {
      const altText = (mdMatch[1] || '').trim();
      const rawUrl = (mdMatch[2] || '').trim();
      const cleanUrl = rawUrl.split(/\s+/)[0]; // Remove optional markdown title if present

      if (cleanUrl) {
        seenUrls.add(cleanUrl);
        const isCamera = cleanUrl.startsWith('data:image/') || /camera|photo|snapshot/i.test(altText);
        results.push({
          id: `img-md-${counter++}`,
          url: cleanUrl,
          alt: altText || `Image ${results.length + 1}`,
          index: results.length,
          sourceType: isCamera ? 'camera' : 'markdown',
          fullTag: mdMatch[0],
          fileName: altText || `embedded-image-${counter}`,
        });
      }
    }

    // 2. Match HTML <img> tags: <img ... src="..." ... />
    const htmlRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let htmlMatch: RegExpExecArray | null;
    while ((htmlMatch = htmlRegex.exec(content)) !== null) {
      const fullTag = htmlMatch[0];
      const srcUrl = (htmlMatch[1] || '').trim();
      if (srcUrl && !seenUrls.has(srcUrl)) {
        seenUrls.add(srcUrl);
        // Extract alt attribute if present
        const altMatch = fullTag.match(/alt=["']([^"']*)["']/i);
        const altText = altMatch ? altMatch[1].trim() : '';

        results.push({
          id: `img-html-${results.length}`,
          url: srcUrl,
          alt: altText || `HTML Image ${results.length + 1}`,
          index: results.length,
          sourceType: 'html',
          fullTag,
          fileName: altText || `html-image-${results.length + 1}`,
        });
      }
    }
  }

  // 3. Match attached images from note metadata
  if (Array.isArray(attachedImages)) {
    attachedImages.forEach((att, attIdx) => {
      const url = att.dataUrl || att.url;
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        results.push({
          id: att.id || `img-att-${attIdx}`,
          url,
          alt: att.caption || att.name || `Attachment ${attIdx + 1}`,
          index: results.length,
          sourceType: 'attachment',
          byteSize: att.size,
          fileName: att.name,
        });
      }
    });
  }

  return results;
}

/**
 * Removes an embedded image from note markdown text.
 * Handles both markdown syntax `![alt](url)` and HTML `<img>` tags.
 */
export function removeImageFromNoteContent(
  content: string,
  image: { url: string; fullTag?: string }
): string {
  if (!content) return '';

  // If we have the exact tag that was matched, replace that first
  if (image.fullTag && content.includes(image.fullTag)) {
    // Replace the tag and any surrounding single newline cleanly
    const replaced = content.replace(image.fullTag, '').replace(/\n{3,}/g, '\n\n');
    return replaced.trim();
  }

  // Fallback: search for markdown image with this URL
  const escapedUrl = image.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mdRegex = new RegExp(`!\\[[^\\]]*\\]\\(${escapedUrl}\\)`, 'g');
  if (mdRegex.test(content)) {
    return content.replace(mdRegex, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  // Fallback: search for HTML img tag with this URL
  const htmlRegex = new RegExp(`<img\\s+[^>]*src=["']${escapedUrl}["'][^>]*>`, 'gi');
  if (htmlRegex.test(content)) {
    return content.replace(htmlRegex, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  return content;
}
