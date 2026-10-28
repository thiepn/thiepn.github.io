import { Note } from '../../types';
import { SearchChunk } from './searchTypes';

/**
 * Fast, deterministic 32-bit FNV-1a hash function for string hashing
 */
export function computeStringHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Computes hash of a chunk including its metadata context
 */
export function computeChunkHash(noteId: string, heading: string | undefined, text: string): string {
  const payload = `${noteId}:${heading || ''}:${text.trim()}`;
  return computeStringHash(payload);
}

/**
 * Intelligently chunks a note based on Markdown headings and paragraph boundaries
 */
export function intelligentChunkNote(note: Note, maxChunkSize = 600, overlap = 80): SearchChunk[] {
  const content = note.content || '';
  const title = note.title ? note.title.trim() : 'Untitled';
  const tagsStr = note.tags && note.tags.length > 0 ? `Tags: ${note.tags.map((t) => `#${t}`).join(' ')}` : '';

  // If note is very short, return a single unified chunk
  if (content.trim().length <= maxChunkSize) {
    const headerPrefix = [title, tagsStr].filter(Boolean).join(' | ');
    const fullText = headerPrefix ? `${headerPrefix}\n\n${content}` : content;
    return [
      {
        id: `${note.id}#chunk-0`,
        noteId: note.id,
        heading: undefined,
        headingLevel: 0,
        text: fullText.trim(),
        charStart: 0,
        charEnd: content.length,
        hash: computeChunkHash(note.id, undefined, fullText),
        tokenCount: Math.ceil(fullText.length / 4),
      },
    ];
  }

  const chunks: SearchChunk[] = [];
  const lines = content.split('\n');
  let currentHeading: string | undefined = undefined;
  let currentHeadingLevel = 0;
  let currentChunkLines: string[] = [];
  let currentStartChar = 0;
  let runningCharCount = 0;
  let chunkIndex = 0;

  // Prefix first chunk with Title & Tags context
  const headerContext = [title, tagsStr].filter(Boolean).join(' | ');

  const flushChunk = () => {
    if (currentChunkLines.length === 0) return;
    const bodyText = currentChunkLines.join('\n').trim();
    if (!bodyText) {
      currentChunkLines = [];
      return;
    }

    // Include heading/title context in chunk representation for richer semantic matching
    let chunkTextToEmbed = bodyText;
    if (chunkIndex === 0 && headerContext) {
      chunkTextToEmbed = `${headerContext}\n\n${bodyText}`;
    } else if (currentHeading && !bodyText.startsWith('#')) {
      chunkTextToEmbed = `${currentHeading}\n${bodyText}`;
    }

    const chunkEndChar = runningCharCount;
    chunks.push({
      id: `${note.id}#chunk-${chunkIndex++}`,
      noteId: note.id,
      heading: currentHeading,
      headingLevel: currentHeadingLevel,
      text: chunkTextToEmbed,
      charStart: currentStartChar,
      charEnd: chunkEndChar,
      hash: computeChunkHash(note.id, currentHeading, chunkTextToEmbed),
      tokenCount: Math.ceil(chunkTextToEmbed.length / 4),
    });

    currentChunkLines = [];
    currentStartChar = runningCharCount;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // If we hit a new heading and accumulated enough content, flush previous chunk
      if (currentChunkLines.length > 0) {
        flushChunk();
      }
      currentHeadingLevel = headingMatch[1].length;
      currentHeading = headingMatch[2].trim();
      currentChunkLines.push(line);
      runningCharCount += line.length + 1;
      continue;
    }

    currentChunkLines.push(line);
    runningCharCount += line.length + 1;

    // Check if current chunk size exceeds maxChunkSize on paragraph break
    const currentLength = currentChunkLines.join('\n').length;
    if (currentLength >= maxChunkSize && (line.trim() === '' || i === lines.length - 1)) {
      flushChunk();
    }
  }

  // Final flush
  flushChunk();

  // If no chunks were created (e.g. empty content but note has title/tags)
  if (chunks.length === 0) {
    const text = [title, tagsStr].filter(Boolean).join('\n');
    chunks.push({
      id: `${note.id}#chunk-0`,
      noteId: note.id,
      heading: undefined,
      headingLevel: 0,
      text: text || 'Empty note',
      charStart: 0,
      charEnd: 0,
      hash: computeChunkHash(note.id, undefined, text || 'Empty note'),
      tokenCount: Math.ceil((text || 'Empty note').length / 4),
    });
  }

  return chunks;
}
