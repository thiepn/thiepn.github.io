import { Note } from '../../types';
import { AIChunk, AIChunkType } from './types';
import { PDFAttachment, PDFAnnotation } from '../pdfTypes';

/**
 * Fast string content hashing for chunk identity and stale verification
 */
export function computeStringHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Approximate token count (~4 characters per token for English markdown)
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

/**
 * Convert heading text into clean slug ID
 */
export function slugifyHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Splits a canonical Markdown note into structured chunks:
 * 1. Primary division: Heading sections (##, ###)
 * 2. Secondary division: If a section is large (> 1500 chars), split by paragraph blocks
 * 3. Fallback: If no headings, split by paragraphs
 */
export function chunkNote(note: Note): AIChunk[] {
  const chunks: AIChunk[] = [];
  const content = note.content || '';
  if (!content.trim()) {
    return chunks;
  }

  const lines = content.split('\n');
  const headingRegex = /^(#{1,6})\s+(.+)$/;

  interface SectionCollector {
    headingText?: string;
    headingLevel?: number;
    lines: string[];
    startLine: number;
  }

  const sections: SectionCollector[] = [];
  let currentSection: SectionCollector = {
    lines: [],
    startLine: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(headingRegex);

    if (match) {
      if (currentSection.lines.length > 0 || currentSection.headingText) {
        sections.push(currentSection);
      }
      currentSection = {
        headingText: match[2].trim(),
        headingLevel: match[1].length,
        lines: [line],
        startLine: i,
      };
    } else {
      currentSection.lines.push(line);
    }
  }

  if (currentSection.lines.length > 0 || currentSection.headingText) {
    sections.push(currentSection);
  }

  let charOffset = 0;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const secText = sec.lines.join('\n').trim();
    if (!secText) continue;

    const headingSlug = sec.headingText ? slugifyHeading(sec.headingText) : `sec-${sIdx}`;
    const chunkLength = secText.length;

    // If section is reasonable size (<= 2000 chars / ~500 tokens), keep as single cohesive chunk
    if (chunkLength <= 2000) {
      chunks.push({
        id: `${note.id}#h:${headingSlug}`,
        noteId: note.id,
        noteTitle: note.title,
        folderId: note.folderId,
        headingText: sec.headingText,
        headingId: headingSlug,
        content: secText,
        contentHash: computeStringHash(secText),
        charStart: charOffset,
        charEnd: charOffset + chunkLength,
        type: 'heading_section',
        tokenEstimate: estimateTokenCount(secText),
      });
    } else {
      // Sub-divide oversized section into paragraph blocks, respecting fenced code blocks
      const rawBlocks = secText.split(/\n\s*\n/);
      const paragraphs: string[] = [];
      let inCodeBlock = false;
      let accumulatedBlock: string[] = [];

      for (const block of rawBlocks) {
        const fenceCount = (block.match(/```/g) || []).length;
        if (inCodeBlock) {
          accumulatedBlock.push(block);
          if (fenceCount % 2 !== 0) {
            inCodeBlock = false;
            paragraphs.push(accumulatedBlock.join('\n\n'));
            accumulatedBlock = [];
          }
        } else {
          if (fenceCount % 2 !== 0) {
            inCodeBlock = true;
            accumulatedBlock.push(block);
          } else {
            paragraphs.push(block);
          }
        }
      }
      if (accumulatedBlock.length > 0) {
        paragraphs.push(accumulatedBlock.join('\n\n'));
      }

      let pOffset = charOffset;

      for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
        const pText = paragraphs[pIdx].trim();
        if (!pText) continue;

        const blockId = `p-${pIdx}`;
        chunks.push({
          id: `${note.id}#h:${headingSlug}:${blockId}`,
          noteId: note.id,
          noteTitle: note.title,
          folderId: note.folderId,
          headingText: sec.headingText,
          headingId: headingSlug,
          blockId: blockId,
          content: sec.headingText ? `## ${sec.headingText}\n\n${pText}` : pText,
          contentHash: computeStringHash(pText),
          charStart: pOffset,
          charEnd: pOffset + pText.length,
          type: 'paragraph',
          tokenEstimate: estimateTokenCount(pText),
        });
        pOffset += pText.length + 2;
      }
    }

    charOffset += chunkLength + 1;
  }

  return chunks;
}

/**
 * Creates chunks from Academic Reference items (BibTeX / Reference Library)
 */
export function chunkReferenceItem(reference: {
  id: string;
  citeKey: string;
  title: string;
  authors?: string[];
  year?: number | string;
  abstract?: string;
  journal?: string;
  tags?: string[];
}): AIChunk | null {
  const parts: string[] = [];
  parts.push(`Reference [@${reference.citeKey}]: ${reference.title}`);
  if (reference.authors && reference.authors.length > 0) {
    parts.push(`Authors: ${reference.authors.join(', ')}`);
  }
  if (reference.year) {
    parts.push(`Year: ${reference.year}`);
  }
  if (reference.journal) {
    parts.push(`Publication: ${reference.journal}`);
  }
  if (reference.abstract) {
    parts.push(`Abstract: ${reference.abstract}`);
  }

  const content = parts.join('\n');
  if (!content.trim()) return null;

  return {
    id: `ref:${reference.id}`,
    noteId: `ref:${reference.id}`,
    noteTitle: reference.title || `@${reference.citeKey}`,
    content: content,
    contentHash: computeStringHash(content),
    charStart: 0,
    charEnd: content.length,
    type: 'reference_abstract',
    tokenEstimate: estimateTokenCount(content),
    metadata: {
      citeKey: reference.citeKey,
      isReference: true,
    },
  };
}

/**
 * Creates chunks from PDF highlights and extracted annotations
 */
export function chunkPDFHighlights(pdf: PDFAttachment, annotations?: PDFAnnotation[]): AIChunk[] {
  const chunks: AIChunk[] = [];
  if (!annotations || annotations.length === 0) return chunks;

  const pdfTitle = pdf.name || pdf.fileName || pdf.title || 'PDF Document';
  const highlights = annotations.filter((a) => a.text && a.text.trim().length > 0);
  for (let i = 0; i < highlights.length; i++) {
    const hl = highlights[i];
    const text = `PDF Highlight from "${pdfTitle}" (Page ${hl.page}):\n> "${hl.text}"${
      hl.note ? `\n\nAnnotation: ${hl.note}` : ''
    }`;

    chunks.push({
      id: `pdf:${pdf.id}#hl:${hl.id}`,
      noteId: `pdf:${pdf.id}`,
      noteTitle: pdfTitle,
      headingText: `Page ${hl.page}`,
      headingId: `page-${hl.page}`,
      content: text,
      contentHash: computeStringHash(text),
      charStart: 0,
      charEnd: text.length,
      type: 'pdf_highlight',
      tokenEstimate: estimateTokenCount(text),
      metadata: {
        pdfId: pdf.id,
        highlightId: hl.id,
        pageNumber: hl.page,
      },
    });
  }

  return chunks;
}
