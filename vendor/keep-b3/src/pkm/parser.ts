import { Note } from '../types';
import { extractTasksFromNote } from './tasks/taskParser';
import { extractCitations } from './reference/citationParser';
import { cardIndex } from './review/cardIndex';
import {
  identifyMaskedRegions,
  maskCodeAndMath,
  MaskedRegion,
} from './masking';

export { identifyMaskedRegions, maskCodeAndMath };
export type { MaskedRegion };
import {
  ParsedNote,
  PKMHeading,
  PKMHeadingNode,
  PKMWikiLink,
  PKMEmbed,
  PKMBlock,
  PKMCodeBlock,
  PKMFrontmatter,
  PKMAttachmentRef,
  PKMMarkdownLink,
} from './types';

/**
 * Utility: Generate anchor-friendly slug for headings
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Utility: Parse YAML frontmatter at start of markdown
 */
export function parseFrontmatter(text: string): {
  frontmatter: PKMFrontmatter | undefined;
  body: string;
  frontmatterLineCount: number;
} {
  if (!text.startsWith('---')) {
    return { frontmatter: undefined, body: text, frontmatterLineCount: 0 };
  }

  const endMatch = text.slice(3).search(/\n---\s*(\n|$)/);
  if (endMatch === -1) {
    return { frontmatter: undefined, body: text, frontmatterLineCount: 0 };
  }

  const rawYaml = text.slice(3, 3 + endMatch).trim();
  const body = text.slice(3 + endMatch + 4).replace(/^\n/, '');
  const frontmatterLineCount = text.slice(0, 3 + endMatch + 4).split('\n').length - 1;

  const fm: PKMFrontmatter = {};
  const lines = rawYaml.split('\n');

  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Array item: - item
    if (trimmed.startsWith('-') && currentKey && currentArray) {
      const itemVal = trimmed.slice(1).trim().replace(/^["']|["']$/g, '');
      if (itemVal) currentArray.push(itemVal);
      continue;
    }

    // Key-value pair: key: value
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      if (currentKey && currentArray) {
        fm[currentKey] = currentArray;
        currentKey = null;
        currentArray = null;
      }

      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();

      if (!val) {
        // Multi-line list or empty
        currentKey = key;
        currentArray = [];
      } else if (val.startsWith('[') && val.endsWith(']')) {
        // Inline list: [a, b, c]
        const items = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        fm[key] = items;
      } else {
        const cleanVal = val.replace(/^["']|["']$/g, '');
        fm[key] = cleanVal;
      }
    }
  }

  if (currentKey && currentArray) {
    fm[currentKey] = currentArray;
  }

  // Normalize aliases & tags in frontmatter if string
  if (typeof fm.aliases === 'string') {
    fm.aliases = [fm.aliases];
  }
  if (typeof fm.tags === 'string') {
    fm.tags = (fm.tags as string).split(',').map((t) => t.trim().replace(/^#/, ''));
  } else if (Array.isArray(fm.tags)) {
    fm.tags = fm.tags.map((t) => String(t).trim().replace(/^#/, ''));
  }

  return { frontmatter: fm, body, frontmatterLineCount };
}

/**
 * Parse subpath targeting in wiki links: #Heading or #^block-id
 */
function parseWikiTarget(rawInner: string): {
  target: string;
  alias?: string;
  subpath?: { type: 'heading' | 'block'; target: string };
} {
  let targetPart = rawInner;
  let alias: string | undefined;

  // Split alias by '|'
  const pipeIdx = rawInner.indexOf('|');
  if (pipeIdx > -1) {
    targetPart = rawInner.slice(0, pipeIdx).trim();
    alias = rawInner.slice(pipeIdx + 1).trim();
  }

  targetPart = targetPart.trim();

  // Split subpath by '#'
  let subpath: { type: 'heading' | 'block'; target: string } | undefined;
  const hashIdx = targetPart.indexOf('#');
  let cleanTarget = targetPart;

  if (hashIdx > -1) {
    cleanTarget = targetPart.slice(0, hashIdx).trim();
    const rawSubpath = targetPart.slice(hashIdx + 1).trim();

    if (rawSubpath.startsWith('^')) {
      subpath = {
        type: 'block',
        target: rawSubpath.slice(1).trim(),
      };
    } else if (rawSubpath) {
      subpath = {
        type: 'heading',
        target: rawSubpath,
      };
    }
  }

  return { target: cleanTarget, alias, subpath };
}

/**
 * Build heading tree from flat list of headings
 */
export function buildHeadingTree(headings: PKMHeading[]): PKMHeadingNode[] {
  const rootNodes: PKMHeadingNode[] = [];
  const stack: PKMHeadingNode[] = [];

  for (const h of headings) {
    const node: PKMHeadingNode = {
      ...h,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootNodes.push(node);
    } else {
      const parent = stack[stack.length - 1];
      node.parentSlug = parent.slug;
      parent.children.push(node);
    }

    stack.push(node);
  }

  return rootNodes;
}

/**
 * Extract clean, searchable text without markdown syntax or code bloat
 */
export function extractSearchableText(rawText: string, note?: Note): string {
  const pieces: string[] = [];

  if (note?.title) pieces.push(note.title);

  // Strip fenced code
  let clean = rawText.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, ' ');
  // Strip inline code
  clean = clean.replace(/`+[^`\n]+?`+/g, ' ');
  // Replace links [[Target|Alias]] with Alias or Target
  clean = clean.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');
  // Replace embeds ![[...]]
  clean = clean.replace(/!\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');
  // Replace markdown links [label](url)
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Strip markdown formatting symbols
  clean = clean.replace(/[#*_~`>[\]()=!|\\-]/g, ' ');

  pieces.push(clean);

  if (note?.checklist && note.checklist.length > 0) {
    pieces.push(note.checklist.map((c) => c.text).join(' '));
  }

  if (note?.tags && note.tags.length > 0) {
    pieces.push(note.tags.join(' '));
  }

  return pieces
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Main Canonical PKM Parser
 * Parses a Note's content and metadata into a rich, structured ParsedNote representation.
 */
export function parseNote(note: Note): ParsedNote {
  const rawContent = note.content || '';
  const rawTitle = (note.title || '').trim();

  // 1. Frontmatter extraction
  const { frontmatter, body, frontmatterLineCount } = parseFrontmatter(rawContent);

  // 2. Code & Math masking to ignore syntax inside code blocks
  const { maskedText, codeBlocks, mathBlocks } = identifyMaskedRegions(rawContent);

  // 3. Line-by-line parsing for Headings, Blocks, Attachments
  const rawLines = rawContent.split('\n');
  const maskedLines = maskedText.split('\n');

  const headings: PKMHeading[] = [];
  const blocks: PKMBlock[] = [];
  const blockMap: Record<string, PKMBlock> = {};
  const tagsSet = new Set<string>();

  // Add explicit note tags
  if (Array.isArray(note.tags)) {
    for (const t of note.tags) {
      const clean = (t || '').trim().toLowerCase().replace(/^#/, '');
      if (clean) tagsSet.add(clean);
    }
  }

  // Add frontmatter tags
  if (frontmatter?.tags && Array.isArray(frontmatter.tags)) {
    for (const t of frontmatter.tags) {
      const clean = String(t).trim().toLowerCase().replace(/^#/, '');
      if (clean) tagsSet.add(clean);
    }
  }

  // 4. Extract Headings & Blocks from masked text
  let charOffset = 0;
  for (let lineIdx = 0; lineIdx < maskedLines.length; lineIdx++) {
    const mLine = maskedLines[lineIdx];
    const rLine = rawLines[lineIdx];

    // Headings: ^#{1,6}\s+(.+)
    const headingMatch = mLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = rLine.replace(/^#{1,6}\s+/, '').trim();
      const slug = slugify(text);

      headings.push({
        level,
        text,
        raw: rLine,
        slug,
        line: lineIdx,
        charOffset,
      });
    }

    // Block ID: \^([a-zA-Z0-9_-]+)\s*$
    const blockMatch = mLine.match(/\^([a-zA-Z0-9_-]+)\s*$/);
    if (blockMatch) {
      const blockId = blockMatch[1];
      const cleanText = rLine.replace(/\^([a-zA-Z0-9_-]+)\s*$/, '').trim();
      const blockItem: PKMBlock = {
        id: blockId,
        line: lineIdx,
        charOffset,
        content: cleanText,
      };
      blocks.push(blockItem);
      blockMap[blockId] = blockItem;
    }

    charOffset += rLine.length + 1; // +1 for \n
  }

  // 5. Extract Wiki Links & Embeds using Regex on Masked Text
  const outgoingLinks: PKMWikiLink[] = [];
  const embeds: PKMEmbed[] = [];
  const attachments: PKMAttachmentRef[] = [];
  const markdownLinks: PKMMarkdownLink[] = [];

  // 5a. Transclusions / Embeds: ![[Target]]
  const embedRegex = /!\[\[(.*?)\]\]/g;
  let embedMatch: RegExpExecArray | null;
  while ((embedMatch = embedRegex.exec(maskedText)) !== null) {
    const rawMatch = rawContent.slice(embedMatch.index, embedMatch.index + embedMatch[0].length);
    const inner = embedMatch[1].trim();
    if (!inner) continue;

    const line = rawContent.slice(0, embedMatch.index).split('\n').length - 1;
    const { target, subpath } = parseWikiTarget(inner);

    // Check if it's an image/audio attachment embed
    const lower = target.toLowerCase();
    if (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.svg')
    ) {
      attachments.push({
        raw: rawMatch,
        name: target,
        type: 'image',
        line,
      });
    } else if (
      lower.endsWith('.mp3') ||
      lower.endsWith('.wav') ||
      lower.endsWith('.ogg') ||
      lower.endsWith('.m4a')
    ) {
      attachments.push({
        raw: rawMatch,
        name: target,
        type: 'audio',
        line,
      });
    } else {
      embeds.push({
        raw: rawMatch,
        target,
        subpath,
        line,
        charOffset: embedMatch.index,
      });
    }
  }

  // 5b. Regular Wiki Links: [[Target]] (ignore if preceded by '!')
  const wikiRegex = /(?<!!)\[\[(.*?)\]\]/g;
  let wikiMatch: RegExpExecArray | null;
  while ((wikiMatch = wikiRegex.exec(maskedText)) !== null) {
    const rawMatch = rawContent.slice(wikiMatch.index, wikiMatch.index + wikiMatch[0].length);
    const inner = wikiMatch[1].trim();
    if (!inner) continue;

    const line = rawContent.slice(0, wikiMatch.index).split('\n').length - 1;
    const { target, alias, subpath } = parseWikiTarget(inner);

    if (target) {
      outgoingLinks.push({
        raw: rawMatch,
        target,
        alias,
        subpath,
        line,
        charOffset: wikiMatch.index,
      });
    }
  }

  // 5c. Standard Markdown Links: [label](url)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdLinkRegex.exec(maskedText)) !== null) {
    const rawMatch = rawContent.slice(mdMatch.index, mdMatch.index + mdMatch[0].length);
    const label = mdMatch[1].trim();
    const url = mdMatch[2].trim();
    const line = rawContent.slice(0, mdMatch.index).split('\n').length - 1;

    markdownLinks.push({
      raw: rawMatch,
      label,
      url,
      line,
    });

    // Check if it's an image link: ![alt](url)
    if (mdMatch.index > 0 && rawContent[mdMatch.index - 1] === '!') {
      attachments.push({
        raw: `!${rawMatch}`,
        name: label,
        type: 'image',
        urlOrPath: url,
        line,
      });
    }
  }

  // 6. Extract Inline Hashtags (#tag, #nested/tag, #tag-name)
  // Must not be hex color (#fff, #123456), numeric (#123), or URL fragment
  const tagRegex = /(?<=^|\s)#([a-zA-Z][a-zA-Z0-9_\-\/]*[a-zA-Z0-9_])/g;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(maskedText)) !== null) {
    const tagVal = tagMatch[1].trim().toLowerCase();
    // Exclude if it looks like a heading anchor or invalid token
    if (tagVal && !tagVal.startsWith('/')) {
      tagsSet.add(tagVal);
    }
  }

  // 7. Aliases aggregation (frontmatter aliases + note title)
  const aliasesSet = new Set<string>();
  if (frontmatter?.aliases && Array.isArray(frontmatter.aliases)) {
    for (const a of frontmatter.aliases) {
      const clean = String(a).trim();
      if (clean) aliasesSet.add(clean);
    }
  }

  // 8. Attachments from Note object images & audios
  if (Array.isArray(note.images)) {
    for (const img of note.images) {
      attachments.push({
        raw: img.name,
        name: img.name,
        type: 'image',
        urlOrPath: img.dataUrl,
        line: 0,
      });
    }
  }
  if (Array.isArray(note.audios)) {
    for (const aud of note.audios) {
      attachments.push({
        raw: aud.name,
        name: aud.name,
        type: 'audio',
        urlOrPath: aud.dataUrl,
        line: 0,
      });
    }
  }

  const headingTree = buildHeadingTree(headings);
  const searchableText = extractSearchableText(rawContent, note);
  const wordCount = rawContent.trim() ? rawContent.trim().split(/\s+/).length : 0;
  const charCount = rawContent.length;
  const tasks = extractTasksFromNote(note);
  const { citations } = extractCitations(rawContent);
  const properties = (frontmatter as Record<string, unknown>) || {};

  // Incrementally update review card index
  try {
    cardIndex.updateNote(note);
  } catch {
    // Non-blocking in case of edge cases
  }

  return {
    noteId: note.id,
    title: rawTitle,
    canonicalTitle: rawTitle.toLowerCase(),
    rawContent,
    aliases: Array.from(aliasesSet),
    folderId: note.folderId,
    tags: Array.from(tagsSet).sort(),
    frontmatter,
    headings,
    headingTree,
    blocks,
    blockMap,
    outgoingLinks,
    embeds,
    markdownLinks,
    codeBlocks,
    mathBlocks,
    attachments,
    tasks,
    citations,
    properties,
    searchableText,
    wordCount,
    charCount,
    modifiedTimestamp: note.updatedAt || note.createdAt || new Date().toISOString(),
  };
}
