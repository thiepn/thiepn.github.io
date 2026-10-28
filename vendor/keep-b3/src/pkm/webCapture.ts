import { NoteImage } from '../types';
import { convertHTMLToMarkdown, ConvertedMarkdownResult } from './htmlToMarkdown';

export interface ProcessedClipboardData {
  markdown: string;
  plainText: string;
  rawHtml: string;
  hasHtml: boolean;
  isRichContent: boolean;
  title?: string;
  sourceUrl?: string;
  images: NoteImage[];
  remoteImageUrls: string[];
  hasTables: boolean;
  wordCount: number;
}

export type PasteMode = 'smart' | 'plain' | 'raw';

/**
 * Reads a File/Blob as a Base64 data URL
 */
export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Attempts to fetch an external image URL and convert it to a local NoteImage.
 * Handles CORS errors gracefully without crashing or using unknown proxies.
 */
export async function tryFetchExternalImage(
  url: string,
  suggestedName?: string
): Promise<{ success: boolean; image?: NoteImage; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error ${response.status} when fetching image`,
      };
    }

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Fetched resource is not an image',
      };
    }

    const dataUrl = await readFileAsDataUrl(blob);
    const fileName = suggestedName || url.split('/').pop()?.split('?')[0] || 'web-image.png';

    const noteImage: NoteImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: fileName,
      dataUrl,
      size: blob.size,
    };

    return { success: true, image: noteImage };
  } catch (err: unknown) {
    const isCors = err instanceof TypeError || String(err).includes('Failed to fetch');
    return {
      success: false,
      error: isCors
        ? 'CORS_RESTRICTED: Remote server does not allow direct cross-origin browser downloads.'
        : String(err),
    };
  }
}

/**
 * Inspects a ClipboardEvent or DataTransfer object and processes its contents
 */
export async function extractClipboardContent(
  clipboardData: DataTransfer | null
): Promise<ProcessedClipboardData> {
  if (!clipboardData) {
    return {
      markdown: '',
      plainText: '',
      rawHtml: '',
      hasHtml: false,
      isRichContent: false,
      images: [],
      remoteImageUrls: [],
      hasTables: false,
      wordCount: 0,
    };
  }

  const plainText = clipboardData.getData('text/plain') || '';
  const rawHtml = clipboardData.getData('text/html') || '';
  const hasHtml = Boolean(rawHtml && rawHtml.trim().length > 0);

  // 1. Process clipboard direct image files
  const imageFiles: File[] = [];
  if (clipboardData.items) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
  } else if (clipboardData.files) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i];
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      }
    }
  }

  const noteImages: NoteImage[] = [];
  for (const imgFile of imageFiles) {
    try {
      const dataUrl = await readFileAsDataUrl(imgFile);
      noteImages.push({
        id: `img-clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: imgFile.name || `Pasted Image ${new Date().toLocaleTimeString()}`,
        dataUrl,
        size: imgFile.size,
      });
    } catch (e) {
      console.warn('Failed to parse clipboard image file:', e);
    }
  }

  // 2. Convert HTML to Markdown if available
  let convResult: ConvertedMarkdownResult = {
    markdown: plainText,
    imageUrls: [],
    hasTables: false,
    wordCount: plainText.trim() ? plainText.trim().split(/\s+/).length : 0,
  };

  if (hasHtml) {
    convResult = convertHTMLToMarkdown(rawHtml);
  }

  // 3. Determine if content is rich (has headers, links, lists, bold, tables, code)
  const isRichContent =
    hasHtml &&
    (convResult.hasTables ||
      convResult.imageUrls.length > 0 ||
      /[#*_`\[\]>\-]/.test(convResult.markdown) ||
      convResult.markdown !== plainText.trim());

  return {
    markdown: hasHtml && convResult.markdown ? convResult.markdown : plainText,
    plainText,
    rawHtml,
    hasHtml,
    isRichContent,
    title: convResult.title,
    sourceUrl: convResult.sourceUrl,
    images: noteImages,
    remoteImageUrls: convResult.imageUrls,
    hasTables: convResult.hasTables,
    wordCount: convResult.wordCount,
  };
}

/**
 * Format a clean Markdown source attribution block
 */
export function formatSourceAttribution(sourceUrl: string, title?: string): string {
  const displayTitle = title ? title.replace(/[[\]]/g, '') : sourceUrl;
  return `\n\n> 🔗 **Source**: [${displayTitle}](${sourceUrl})\n`;
}

/**
 * Build a new note content payload with optional source attribution
 */
export function composeCapturedNoteContent(
  markdown: string,
  options: {
    sourceUrl?: string;
    title?: string;
    includeAttribution?: boolean;
    headerNote?: string;
  } = {}
): string {
  let content = markdown.trim();

  if (options.headerNote) {
    content = `${options.headerNote.trim()}\n\n${content}`;
  }

  if (options.includeAttribution && options.sourceUrl) {
    content = `${content}${formatSourceAttribution(options.sourceUrl, options.title)}`;
  }

  return content;
}
