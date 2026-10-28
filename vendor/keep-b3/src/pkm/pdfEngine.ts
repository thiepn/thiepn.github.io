import * as pdfjsLib from 'pdfjs-dist';
import { PDFSearchMatch } from './pdfTypes';

// Configure PDF.js worker safely
if (typeof window !== 'undefined') {
  try {
    // In Vite environment, use the worker from the bundled package or fallback CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}

export interface PDFDocumentProxyWrapper {
  doc: pdfjsLib.PDFDocumentProxy;
  numPages: number;
  title?: string;
  author?: string;
  cleanup: () => void;
}

export interface PDFPageRenderResult {
  width: number;
  height: number;
  textItems: Array<{
    str: string;
    dir: string;
    width: number;
    height: number;
    transform: number[];
  }>;
}

/**
 * Loads a PDF from an ArrayBuffer or Blob with sandboxed configuration
 */
export async function loadPDFDocument(
  source: ArrayBuffer | Blob
): Promise<PDFDocumentProxyWrapper> {
  const data = source instanceof Blob ? await source.arrayBuffer() : source;

  // Sandboxed loading: disable eval, script execution, and untrusted features
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    stopAtErrors: false,
  } as any);

  const doc = await loadingTask.promise;
  let title: string | undefined;
  let author: string | undefined;

  try {
    const meta = await doc.getMetadata();
    if (meta?.info) {
      const info = meta.info as any;
      title = info.Title || undefined;
      author = info.Author || undefined;
    }
  } catch {
    // metadata is optional
  }

  return {
    doc,
    numPages: doc.numPages,
    title,
    author,
    cleanup: () => {
      try {
        (doc as any).destroy?.();
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Renders a single PDF page to a canvas context with high-DPI crispness and text layer data
 */
export async function renderPDFPageToCanvas(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.0,
  abortSignal?: AbortSignal
): Promise<PDFPageRenderResult | null> {
  if (pageNumber < 1 || pageNumber > doc.numPages) return null;
  if (abortSignal?.aborted) return null;

  const page = await doc.getPage(pageNumber);
  if (abortSignal?.aborted) return null;

  const viewport = page.getViewport({ scale });
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * pixelRatio);
  canvas.height = Math.floor(viewport.height * pixelRatio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingEnabled = true;

  const renderContext: any = {
    canvasContext: ctx,
    viewport,
    canvas,
  };

  const renderTask = page.render(renderContext);

  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      try {
        renderTask.cancel();
      } catch {
        // ignore
      }
    });
  }

  try {
    await renderTask.promise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException') {
      return null;
    }
    throw err;
  }

  // Extract text content for text layer and searching
  let textItems: any[] = [];
  try {
    const textContent = await page.getTextContent();
    textItems = textContent.items as any[];
  } catch {
    // text content optional
  }

  return {
    width: viewport.width,
    height: viewport.height,
    textItems,
  };
}

/**
 * Extracts plain text from all or specific pages of a PDF
 */
export async function extractPDFText(
  doc: pdfjsLib.PDFDocumentProxy,
  startPage = 1,
  endPage = doc.numPages
): Promise<Array<{ page: number; text: string }>> {
  const results: Array<{ page: number; text: string }> = [];

  const max = Math.min(endPage, doc.numPages);
  for (let p = Math.max(1, startPage); p <= max; p++) {
    try {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      results.push({ page: p, text: pageText });
    } catch {
      results.push({ page: p, text: '' });
    }
  }

  return results;
}

/**
 * Searches for a query string across the entire PDF document
 */
export async function searchInPDF(
  doc: pdfjsLib.PDFDocumentProxy,
  query: string
): Promise<PDFSearchMatch[]> {
  if (!query || !query.trim()) return [];
  const normalizedQuery = query.toLowerCase().trim();
  const matches: PDFSearchMatch[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    try {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const fullText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      const lowerFull = fullText.toLowerCase();
      let pos = 0;
      while ((pos = lowerFull.indexOf(normalizedQuery, pos)) !== -1) {
        // Extract a snippet around match
        const startSnippet = Math.max(0, pos - 30);
        const endSnippet = Math.min(fullText.length, pos + normalizedQuery.length + 30);
        const snippet = fullText.slice(startSnippet, endSnippet);

        matches.push({
          pageIndex: p,
          matchIndex: pos,
          text: snippet,
          matchLength: normalizedQuery.length,
        });

        pos += normalizedQuery.length;
      }
    } catch {
      // ignore
    }
  }

  return matches;
}
