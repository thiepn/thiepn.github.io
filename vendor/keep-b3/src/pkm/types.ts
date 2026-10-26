import { Note, NoteColorKey } from '../types';

/**
 * Heading entry in a note
 */
export interface PKMHeading {
  level: number; // 1 to 6
  text: string; // Plain text title of the heading
  raw: string; // Raw markdown (e.g. "## Section Title")
  slug: string; // URL/anchor friendly slug (e.g. "section-title")
  line: number; // 0-indexed line number in source
  charOffset: number; // Character offset in source content
}

/**
 * Hierarchical tree representation of headings
 */
export interface PKMHeadingNode extends PKMHeading {
  children: PKMHeadingNode[];
  parentSlug?: string;
}

/**
 * Parsed Wiki-Link: [[Target]], [[Target|Alias]], [[Target#Heading]], [[Target#^block-id]]
 */
export interface PKMWikiLink {
  raw: string; // Original matching string (e.g. "[[My Note#Summary|Custom Label]]")
  target: string; // Cleaned target note name or note ID (e.g. "My Note" or "note:123")
  alias?: string; // Display alias if specified (e.g. "Custom Label")
  subpath?: {
    type: 'heading' | 'block';
    target: string; // Heading text/slug or block ID
  };
  line: number; // 0-indexed line number where link occurs
  charOffset: number; // Character offset in source
}

/**
 * Parsed Transclusion / Embed: ![[Target]], ![[Note#Heading]], ![[Note#^block-id]]
 */
export interface PKMEmbed {
  raw: string; // Original matching string (e.g. "![[Design Doc#Architecture]]")
  target: string; // Target note name or ID
  subpath?: {
    type: 'heading' | 'block';
    target: string;
  };
  line: number;
  charOffset: number;
}

/**
 * Block identifier inside a note (Obsidian style `^block-id` at line end)
 */
export interface PKMBlock {
  id: string; // e.g. "arch-overview" from "^arch-overview"
  line: number; // 0-indexed line number
  charOffset: number;
  content: string; // Text content of the line/paragraph containing the block ID
}

/**
 * Code block metadata
 */
export interface PKMCodeBlock {
  language: string;
  type: 'fenced' | 'query' | 'mermaid' | 'math';
  content: string;
  lineStart: number;
  lineEnd: number;
}

import { PKMTask } from './tasks/taskTypes';
import { PropertyDictionary } from './properties/propertyTypes';
import { CitationMatch, CitingNoteReference } from './reference/referenceTypes';

/**
 * Frontmatter / YAML metadata key-value pairs
 */
export interface PKMFrontmatter {
  title?: string;
  aliases?: string[];
  tags?: string[];
  date?: string;
  due?: string;
  status?: string;
  priority?: string;
  [key: string]: unknown;
}

/**
 * Attachment reference within note content
 */
export interface PKMAttachmentRef {
  raw: string;
  name: string;
  type: 'image' | 'audio' | 'file';
  urlOrPath?: string;
  line: number;
}

/**
 * Standard Markdown link: [Label](url)
 */
export interface PKMMarkdownLink {
  raw: string;
  label: string;
  url: string;
  line: number;
}

/**
 * Complete parsed representation of a single Note
 */
export interface ParsedNote {
  noteId: string;
  title: string;
  canonicalTitle: string; // Trimmed & normalized
  rawContent: string; // Full raw note markdown content
  aliases: string[];
  folderId: string | null;
  tags: string[]; // Normalized tags from frontmatter, note tags & inline #tags
  frontmatter?: PKMFrontmatter;
  headings: PKMHeading[];
  headingTree: PKMHeadingNode[];
  blocks: PKMBlock[];
  blockMap: Record<string, PKMBlock>; // Quick lookup by blockId
  outgoingLinks: PKMWikiLink[];
  embeds: PKMEmbed[];
  markdownLinks: PKMMarkdownLink[];
  codeBlocks: PKMCodeBlock[];
  mathBlocks: string[];
  attachments: PKMAttachmentRef[];
  tasks: PKMTask[];
  citations?: CitationMatch[];
  properties: Record<string, unknown>;
  searchableText: string; // Stripped plain text tokens for fast search
  wordCount: number;
  charCount: number;
  modifiedTimestamp: string;
}

/**
 * Link resolution result types
 */
export type ResolutionStatus = 'resolved' | 'missing' | 'ambiguous';

export interface ResolvedLinkTarget {
  status: ResolutionStatus;
  targetRaw: string;
  resolvedNoteId?: string;
  resolvedNoteTitle?: string;
  resolvedHeading?: PKMHeading;
  resolvedBlock?: PKMBlock;
  candidates?: Array<{ noteId: string; title: string }>; // For ambiguous status
  subpathStatus?: 'found' | 'not_found' | 'none';
}

/**
 * Backlink reference to a note
 */
export interface PKMBacklink {
  sourceNoteId: string;
  sourceNoteTitle: string;
  link: PKMWikiLink;
  contextSnippet: string; // Line or paragraph containing the link
}

/**
 * Complete Derived Vault Index
 */
export interface VaultIndex {
  version: number;
  generatedAt: string;
  noteCount: number;
  
  // Primary Note Index (noteId -> ParsedNote)
  notes: Record<string, ParsedNote>;
  
  // Fast Lookup Maps
  titleToNoteIds: Record<string, string[]>; // Normalized title -> noteId[] (handles duplicate titles)
  aliasToNoteIds: Record<string, string[]>; // Normalized alias -> noteId[]
  folderToNoteIds: Record<string, string[]>; // folderId -> noteId[]
  tagToNoteIds: Record<string, string[]>; // tag -> noteId[]
  
  // Forward & Backward Link Graphs
  // noteId -> target noteIds
  forwardLinks: Record<string, string[]>;
  // noteId -> list of backlinks referencing this note
  backlinks: Record<string, PKMBacklink[]>;
  
  // Unresolved links: noteId -> list of wiki links with no target
  unresolvedLinks: Record<string, PKMWikiLink[]>;
  
  // All unique tags across the vault with frequencies
  tagCounts: Record<string, number>;
  
  // Phase P25: Vault Tasks & Properties
  tasks: Record<string, PKMTask[]>; // noteId -> tasks
  allTasks: PKMTask[]; // Flattened list of all tasks
  propertyDictionary: PropertyDictionary; // Aggregated property definitions & metadata
  
  // Phase P35: Academic Citations Index
  citationsByKey?: Record<string, CitingNoteReference[]>; // citationKeyLower -> citing note references
}

/**
 * Incremental change event
 */
export type NoteIndexChangeEvent =
  | { type: 'note_created'; note: Note }
  | { type: 'note_updated'; note: Note; oldNote?: Note }
  | { type: 'note_deleted'; noteId: string }
  | { type: 'vault_rebuild'; notes: Note[] };

/**
 * Browser Capabilities Report
 */
export interface BrowserCapabilities {
  fileSystemAccess: boolean;
  originPrivateFileSystem: boolean;
  webGPU: boolean;
  webWorkers: boolean;
  clipboardApi: boolean;
  storageQuota: boolean;
  quotaEstimated?: {
    quota: number;
    usage: number;
    usagePercent: number;
  };
}
