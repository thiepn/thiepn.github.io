import { Note } from '../types';
import {
  VaultIndex,
  ParsedNote,
  PKMHeading,
  PKMBlock,
} from './types';
import { slugify, parseNote, parseFrontmatter } from './parser';
import { PKMResolver } from './resolver';

export type TransclusionType = 'note' | 'section' | 'block';

export type TransclusionStatus =
  | 'resolved'
  | 'missing_note'
  | 'missing_heading'
  | 'missing_block'
  | 'ambiguous'
  | 'circular_dependency'
  | 'max_depth_exceeded';

export interface ResolvedTransclusion {
  status: TransclusionStatus;
  rawTarget: string;
  embedType: TransclusionType;
  sourceNoteId: string;
  targetNoteId?: string;
  targetNoteTitle?: string;
  heading?: PKMHeading;
  block?: PKMBlock;
  content: string;
  error?: string;
  cycleChain?: string[];
  candidates?: Array<{ noteId: string; title: string }>;
  depth: number;
}

export const MAX_TRANSCLUSION_DEPTH = 4;

/**
 * Extract a heading section from markdown content.
 * Locates the exact heading and includes its content until the next heading of equal or higher level.
 * Preserves all nested subsections.
 */
export function extractSection(
  content: string,
  headingQuery: string,
  headings?: PKMHeading[]
): { heading: PKMHeading; content: string; startLine: number; endLine: number } | null {
  if (!content || !headingQuery) return null;
  const rawLines = content.split('\n');

  let noteHeadings = headings;
  if (!noteHeadings) {
    const parsed = parseNote({
      id: 'temp',
      title: '',
      content,
      type: 'text',
      tags: [],
      color: 'default',
      folderId: null,
      pinned: false,
      trashed: false,
      checklist: [],
      archived: false,
      reminderDate: null,
      images: [],
      createdAt: '',
      updatedAt: '',
    });
    noteHeadings = parsed.headings;
  }

  if (!noteHeadings || noteHeadings.length === 0) return null;

  const querySlug = slugify(headingQuery);
  const queryLower = headingQuery.toLowerCase().trim();

  // Find target heading by slug, plain text, or normalized text
  const headingIdx = noteHeadings.findIndex((h) => {
    return (
      h.slug === querySlug ||
      h.text.toLowerCase().trim() === queryLower ||
      slugify(h.text) === querySlug
    );
  });

  if (headingIdx === -1) return null;

  const targetHeading = noteHeadings[headingIdx];
  const startLine = targetHeading.line;

  // Find next heading with level <= targetHeading.level
  let endLine = rawLines.length - 1;
  for (let i = headingIdx + 1; i < noteHeadings.length; i++) {
    const nextH = noteHeadings[i];
    if (nextH.level <= targetHeading.level) {
      endLine = nextH.line - 1;
      break;
    }
  }

  const sectionLines = rawLines.slice(startLine, endLine + 1);
  const extractedText = sectionLines.join('\n').trimEnd();

  return {
    heading: targetHeading,
    content: extractedText,
    startLine,
    endLine,
  };
}

/**
 * Extract a stable block reference (e.g. `^block-id` at line end) from markdown content.
 * Locates the paragraph/block and strips the trailing `^block-id` identifier for clean rendering.
 */
export function extractBlock(
  content: string,
  blockId: string,
  blocks?: PKMBlock[]
): { block: PKMBlock; content: string; startLine: number; endLine: number } | null {
  if (!content || !blockId) return null;
  const cleanId = blockId.replace(/^\^/, '').trim();
  if (!cleanId) return null;

  const rawLines = content.split('\n');

  // Locate the line index containing ^blockId
  let targetLineIdx = -1;
  const blockRegex = new RegExp(`\\^${cleanId}\\s*$`);

  for (let i = 0; i < rawLines.length; i++) {
    if (blockRegex.test(rawLines[i])) {
      targetLineIdx = i;
      break;
    }
  }

  if (targetLineIdx === -1) {
    return null;
  }

  // Find paragraph / block boundary moving upwards
  let startLine = targetLineIdx;
  while (startLine > 0) {
    const prevLine = rawLines[startLine - 1].trim();
    // Stop at empty line, markdown heading, table delimiter, or horizontal rule
    if (
      !prevLine ||
      prevLine.startsWith('#') ||
      prevLine.startsWith('---') ||
      prevLine.startsWith('***')
    ) {
      break;
    }
    startLine--;
  }

  const endLine = targetLineIdx;
  const blockLines = rawLines.slice(startLine, endLine + 1);

  // Strip the ^block-id marker from the final line of the block
  const lastIdx = blockLines.length - 1;
  blockLines[lastIdx] = blockLines[lastIdx].replace(new RegExp(`\\s*\\^${cleanId}\\s*$`), '');

  const cleanContent = blockLines.join('\n').trim();

  const blockObj: PKMBlock = {
    id: cleanId,
    line: targetLineIdx,
    charOffset: 0,
    content: cleanContent,
  };

  return {
    block: blockObj,
    content: cleanContent,
    startLine,
    endLine,
  };
}

/**
 * Strips raw block-id suffixes (`^block-id`) from arbitrary markdown for presentation
 */
export function stripBlockIdsFromMarkdown(markdown: string): string {
  if (!markdown) return '';
  return markdown.replace(/[ \t]+\^[a-zA-Z0-9_-]+\s*$/gm, '');
}

export interface ResolveTransclusionOptions {
  visitedChain?: string[];
  maxDepth?: number;
  depth?: number;
  allNotesLookup?: Map<string, Note>;
}

/**
 * Resolves a transclusion reference (e.g. `![[Note Title]]`, `![[Note#Heading]]`, `![[Note#^block]]`)
 * into its extracted content with cycle detection and depth limiting.
 */
export function resolveTransclusion(
  embedRawInner: string,
  sourceNoteId: string,
  vaultIndex: VaultIndex,
  options: ResolveTransclusionOptions = {}
): ResolvedTransclusion {
  const currentDepth = options.depth ?? 0;
  const maxDepth = options.maxDepth ?? MAX_TRANSCLUSION_DEPTH;
  const visitedChain = options.visitedChain ?? (sourceNoteId ? [sourceNoteId] : []);

  const rawTrimmed = embedRawInner.trim();

  // Max recursion depth guard
  if (currentDepth >= maxDepth) {
    return {
      status: 'max_depth_exceeded',
      rawTarget: rawTrimmed,
      embedType: 'note',
      sourceNoteId,
      content: '',
      depth: currentDepth,
      error: `Maximum transclusion depth (${maxDepth}) exceeded.`,
    };
  }

  // Parse target and subpath
  let noteTargetPart = rawTrimmed;
  let subpathPart: string | null = null;
  const hashIdx = rawTrimmed.indexOf('#');

  if (hashIdx > -1) {
    noteTargetPart = rawTrimmed.slice(0, hashIdx).trim();
    subpathPart = rawTrimmed.slice(hashIdx + 1).trim();
  }

  // Determine embed type
  let embedType: TransclusionType = 'note';
  if (subpathPart) {
    embedType = subpathPart.startsWith('^') ? 'block' : 'section';
  }

  // 1. Resolve target note via PKMResolver
  const resolveTargetString = noteTargetPart || (sourceNoteId ? `note:${sourceNoteId}` : '');
  const linkRes = PKMResolver.resolveLink(resolveTargetString, vaultIndex, {
    currentNoteId: sourceNoteId,
  });

  if (linkRes.status === 'ambiguous') {
    return {
      status: 'ambiguous',
      rawTarget: rawTrimmed,
      embedType,
      sourceNoteId,
      content: '',
      depth: currentDepth,
      candidates: linkRes.candidates,
      error: `Ambiguous note reference "${noteTargetPart}" matches multiple notes.`,
    };
  }

  if (linkRes.status !== 'resolved' || !linkRes.resolvedNoteId) {
    return {
      status: 'missing_note',
      rawTarget: rawTrimmed,
      embedType,
      sourceNoteId,
      content: '',
      depth: currentDepth,
      error: `Target note "${noteTargetPart || rawTrimmed}" not found in vault.`,
    };
  }

  const targetNoteId = linkRes.resolvedNoteId;
  const targetParsed = vaultIndex.notes[targetNoteId];
  const targetTitle = linkRes.resolvedNoteTitle || targetParsed?.title || noteTargetPart;

  // 2. Cycle Detection: Check if target note is already in the visited call chain
  if (visitedChain.includes(targetNoteId)) {
    const cycleNames = visitedChain
      .map((id) => vaultIndex.notes[id]?.title || id)
      .concat(targetTitle);

    return {
      status: 'circular_dependency',
      rawTarget: rawTrimmed,
      embedType,
      sourceNoteId,
      targetNoteId,
      targetNoteTitle: targetTitle,
      content: '',
      depth: currentDepth,
      cycleChain: cycleNames,
      error: `Circular transclusion detected: ${cycleNames.join(' ➔ ')}`,
    };
  }

  // 3. Extract target content from the note
  let rawContent = '';
  if (options.allNotesLookup && options.allNotesLookup.has(targetNoteId)) {
    rawContent = options.allNotesLookup.get(targetNoteId)?.content || '';
  } else if (targetParsed && typeof targetParsed.rawContent === 'string') {
    rawContent = targetParsed.rawContent;
  } else {
    rawContent = targetParsed?.searchableText || '';
  }

  // Handle section extraction
  if (embedType === 'section' && subpathPart) {
    const sectionResult = extractSection(
      rawContent,
      subpathPart,
      targetParsed?.headings
    );

    if (!sectionResult) {
      return {
        status: 'missing_heading',
        rawTarget: rawTrimmed,
        embedType: 'section',
        sourceNoteId,
        targetNoteId,
        targetNoteTitle: targetTitle,
        content: '',
        depth: currentDepth,
        error: `Heading "#${subpathPart}" not found in "${targetTitle}".`,
      };
    }

    return {
      status: 'resolved',
      rawTarget: rawTrimmed,
      embedType: 'section',
      sourceNoteId,
      targetNoteId,
      targetNoteTitle: targetTitle,
      heading: sectionResult.heading,
      content: sectionResult.content,
      depth: currentDepth,
    };
  }

  // Handle block extraction
  if (embedType === 'block' && subpathPart) {
    const blockId = subpathPart.replace(/^\^/, '');
    const blockResult = extractBlock(rawContent, blockId, targetParsed?.blocks);

    if (!blockResult) {
      return {
        status: 'missing_block',
        rawTarget: rawTrimmed,
        embedType: 'block',
        sourceNoteId,
        targetNoteId,
        targetNoteTitle: targetTitle,
        content: '',
        depth: currentDepth,
        error: `Block reference "#^${blockId}" not found in "${targetTitle}".`,
      };
    }

    return {
      status: 'resolved',
      rawTarget: rawTrimmed,
      embedType: 'block',
      sourceNoteId,
      targetNoteId,
      targetNoteTitle: targetTitle,
      block: blockResult.block,
      content: blockResult.content,
      depth: currentDepth,
    };
  }

  // Handle full note extraction (strip frontmatter)
  const bodyContent = parseFrontmatter(rawContent).body.trim();

  return {
    status: 'resolved',
    rawTarget: rawTrimmed,
    embedType: 'note',
    sourceNoteId,
    targetNoteId,
    targetNoteTitle: targetTitle,
    content: bodyContent,
    depth: currentDepth,
  };
}
