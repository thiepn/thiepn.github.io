import { PDFAttachment, PDFAnnotation, PDFCitationReference } from './pdfTypes';

/**
 * Parses internal PDF target links such as:
 * - "pdf:pdf-123#page=4&highlight=ann-789"
 * - "pdf:pdf-123#page=4"
 * - "pdf:pdf-123"
 * - "pdf:pdf-123?page=4&highlight=ann-789"
 */
export function parsePDFTarget(target: string): (PDFCitationReference & { pdfAttachmentId: string }) | null {
  if (!target) return null;
  const clean = target.trim();
  if (!clean.startsWith('pdf:') && !clean.includes('.pdf#') && !clean.includes('.pdf?')) {
    return null;
  }

  let pdfId = clean;
  let page = 1;
  let highlightId: string | undefined;

  // Strip leading "pdf:" if present
  let remainder = clean.startsWith('pdf:') ? clean.slice(4) : clean;

  // Check query or hash params
  const hashIdx = remainder.indexOf('#');
  const queryIdx = remainder.indexOf('?');
  const sepIdx = hashIdx !== -1 ? hashIdx : queryIdx;

  if (sepIdx !== -1) {
    pdfId = remainder.slice(0, sepIdx).trim();
    const paramsStr = remainder.slice(sepIdx + 1);
    
    // Parse params: page=4&highlight=ann-123 or page=4
    const params = new URLSearchParams(paramsStr.replace(/&amp;/g, '&'));
    const pageVal = params.get('page') || params.get('p');
    if (pageVal) {
      const parsedPage = parseInt(pageVal, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        page = parsedPage;
      }
    }
    const hVal = params.get('highlight') || params.get('h') || params.get('annotation');
    if (hVal) {
      highlightId = hVal;
    }
  } else {
    pdfId = remainder;
  }

  return {
    pdfId,
    pdfAttachmentId: pdfId,
    page,
    highlightId,
  };
}

/**
 * Formats a PDF internal target URI: pdf:docId#page=X[&highlight=Y]
 */
export function formatPDFTarget(
  pdfId: string,
  page = 1,
  highlightId?: string
): string {
  if (highlightId) {
    return `pdf:${pdfId}#page=${page}&highlight=${highlightId}`;
  }
  return `pdf:${pdfId}#page=${page}`;
}

/**
 * Generates an internal wiki-link for a PDF citation
 */
export function formatPDFWikiLink(
  pdfId: string,
  docTitle: string,
  page: number,
  highlightId?: string
): string {
  const target = formatPDFTarget(pdfId, page, highlightId);
  const display = `${docTitle || 'Document'}, p. ${page}`;
  return `[[${target}|${display}]]`;
}

/**
 * Alias for formatPDFWikiLink
 */
export const formatPDFCitationLink = formatPDFWikiLink;

/**
 * Generates a full Markdown citation for a single highlight
 */
export function formatHighlightCitation(
  annotation: PDFAnnotation,
  attachment: PDFAttachment,
  includeComment = true
): string {
  const docTitle = attachment.title || attachment.name.replace(/\.pdf$/i, '');
  const link = formatPDFWikiLink(attachment.id, docTitle, annotation.page, annotation.id);

  let md = `> "${annotation.text.trim()}"\n— ${link}`;
  
  if (includeComment && annotation.note && annotation.note.trim()) {
    md += `\n\n**Note**: ${annotation.note.trim()}`;
  }

  return md;
}

/**
 * Alias for formatHighlightCitation
 */
export const generateHighlightCitationMarkdown = formatHighlightCitation;

/**
 * Generates a complete Markdown summary of all annotations in a PDF
 */
export function exportHighlightsToMarkdown(
  attachment: PDFAttachment,
  annotations: PDFAnnotation[]
): string {
  const docTitle = attachment.title || attachment.name.replace(/\.pdf$/i, '');
  const sorted = [...annotations].sort((a, b) => a.page - b.page);

  if (sorted.length === 0) {
    return `### Highlights from ${docTitle}\n\n*No highlights recorded yet.*`;
  }

  let md = `### 📑 Highlights: ${docTitle}\n\n`;
  md += `**Document**: [[pdf:${attachment.id}|${docTitle}]] | **Pages**: ${attachment.pageCount} | **Extracted Highlights**: ${sorted.length}\n\n`;

  let currentPage = -1;
  for (const ann of sorted) {
    if (ann.page !== currentPage) {
      currentPage = ann.page;
      md += `#### Page ${currentPage}\n\n`;
    }

    const citationLink = formatPDFWikiLink(attachment.id, docTitle, ann.page, ann.id);
    md += `> "${ann.text.trim()}"\n— ${citationLink}\n`;
    
    if (ann.note && ann.note.trim()) {
      md += `\n> 💡 **Note**: ${ann.note.trim()}\n`;
    }
    md += '\n';
  }

  return md.trim();
}

/**
 * Creates full markdown content for a dedicated Reference / Literature Note
 */
export function generateLiteratureNoteContent(
  attachment: PDFAttachment,
  annotations: PDFAnnotation[] = []
): string {
  const docTitle = attachment.title || attachment.name.replace(/\.pdf$/i, '');
  const fileName = (attachment as { fileName?: string }).fileName || attachment.name;
  const sorted = [...annotations].sort((a, b) => a.page - b.page);

  let md = `# Literature Note: ${docTitle}\n\n`;
  md += `- **Document**: [[pdf:${attachment.id}#page=1|${docTitle} (${fileName})]]\n`;
  md += `- **File**: \`${fileName}\` (${(attachment.size / (1024 * 1024)).toFixed(2)} MB, ${attachment.pageCount} pages)\n`;
  md += `- **Added**: ${new Date(attachment.createdAt).toLocaleDateString()}\n`;
  md += `- **Tags**: #literature-note #pdf-paper\n\n`;

  md += `## Summary & Key Takeaways\n\n- \n\n`;
  md += `## Key Concepts & Terms\n\n- \n\n`;
  md += `## Highlights & Extracted Passages\n\n`;

  if (sorted.length === 0) {
    md += `*No highlights recorded yet.*\n`;
  } else {
    let currentPage = -1;
    for (const ann of sorted) {
      if (ann.page !== currentPage) {
        currentPage = ann.page;
        md += `### Page ${currentPage}\n\n`;
      }
      const citationLink = formatPDFWikiLink(attachment.id, docTitle, ann.page, ann.id);
      md += `> "${ann.text.trim()}"\n— ${citationLink}\n`;
      if (ann.note && ann.note.trim()) {
        md += `\n**Note**: ${ann.note.trim()}\n`;
      }
      md += `\n`;
    }
  }

  return md.trim();
}
