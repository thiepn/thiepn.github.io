import React, { useMemo, useState, useEffect } from 'react';
import {
  Link2,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Tag as TagIcon,
  Image as ImageIcon,
  Volume2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Note, Folder } from '../types';
import { vaultManager } from './indexer';
import { resolveTransclusion, stripBlockIdsFromMarkdown } from './transclusion';
import { TransclusionEmbed } from './TransclusionEmbed';
import { slugify } from './parser';
import {
  parseMarkdownSections,
  parseNestedListItems,
  FoldStateManager,
  NoteFoldState,
} from './outliner';
import { PKMResolver } from './resolver';
import { MathView } from './MathView';
import { MermaidBlockView } from './MermaidBlockView';
import { SmartQueryBlockView } from './SmartQueryBlockView';
import { MOCBlockView } from './moc/MOCBlockView';
import { isLikelyMathFormula } from './math';
import { MarkdownTableEditor } from './MarkdownTableEditor';
import { parseMarkdownTable, isDelimiterRow, replaceTableInMarkdown } from './tableParser';
import { parsePDFTarget } from './pdfCitation';
import { parseCalloutBlock, CalloutView } from './editor';
import { MediaEmbed } from './media/MediaEmbed';
import { sanitizeUrl, isSafeUrl } from './security/sanitizer';
import { BibliographyBlockView } from './reference/ui/BibliographyBlockView';
import { CitationPopover } from './reference/ui/CitationPopover';
import { referenceStorageService } from './reference/referenceStorageService';
import { formatInlineCitation } from './reference/citationFormatter';
import { extractCitations } from './reference/citationParser';
import { WikiLinkPreviewPopover } from '../components/pkm/WikiLinkPreviewPopover';

interface PKMPreviewRendererProps {
  content: string;
  sourceNoteId: string;
  allNotes?: Note[];
  folders?: Folder[];
  onOpenNote?: (noteId: string) => void;
  onCreateNote?: (title: string) => void;
  onOpenPDF?: (pdfId: string, page?: number, highlightId?: string) => void;
  onContentChange?: (newContent: string) => void;
  depth?: number;
  visitedChain?: string[];
  externalFoldState?: NoteFoldState;
  onToggleExternalFold?: (sectionId: string) => void;
  onImageClick?: (url: string, alt?: string) => void;
}

interface InlineSegment {
  type:
    | 'text'
    | 'wikilink'
    | 'pdflink'
    | 'citation'
    | 'tag'
    | 'bold'
    | 'italic'
    | 'strike'
    | 'code'
    | 'mdlink'
    | 'image'
    | 'blockid'
    | 'inlinemath';
  content: string;
  targetTitle?: string;
  targetHeading?: string;
  targetNoteId?: string;
  citationKey?: string;
  citationRaw?: string;
  locator?: string;
  pdfId?: string;
  pdfPage?: number;
  pdfHighlightId?: string;
  alias?: string;
  url?: string;
  blockId?: string;
}

/**
 * Parses inline formatting: wiki links [[...]], citations [@...], tags #..., bold, italic, strike, code, links, inline math $...$
 */
export function parseInlineMarkdown(
  text: string,
  allNotesLookup?: Map<string, Note>,
  vaultIndex = vaultManager.getIndex()
): InlineSegment[] {
  if (!text) return [];

  const segments: InlineSegment[] = [];

  // Tokenize regex matching citations, wikilinks, markdown links, tags, inline code, bold, italic, strikethrough, block-id, inline math, escaped dollar
  // Order matters: match citations & wiki links & code first so inner characters are preserved
  const tokenRegex =
    /(\[@[a-zA-Z0-9_:-]+(?:\s*,\s*[^\]]+)?(?:\s*;\s*@[a-zA-Z0-9_:-]+(?:\s*,\s*[^\]]+)?)*\]|\[\[(?:[^|\]]*\|)?(?:[^\]]+)\]\]|`[^`\n]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|(?<=^|\s)#[a-zA-Z][a-zA-Z0-9_\-\/]*|\^[a-zA-Z0-9_-]+$|(?<!\\)\$(?!\s)([^$\n]+?)(?<!\s|\$)\$|\\\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const token = match[0];

    // Escaped dollar \$ -> plain $
    if (token === '\\$') {
      segments.push({
        type: 'text',
        content: '$',
      });
    }
    // 0. Citation: [@citationKey] or [@key, p. 42]
    else if (token.startsWith('[@') && token.endsWith(']')) {
      const { citations } = extractCitations(token);
      if (citations.length > 0) {
        segments.push({
          type: 'citation',
          content: token,
          citationKey: citations[0].citationKey,
          citationRaw: token,
          locator: citations[0].locator,
        });
      } else {
        segments.push({
          type: 'text',
          content: token,
        });
      }
    }
    // 1. Wiki Link: [[Target]] or [[Target|Alias]] or [[Target#Heading]] or [[pdf:...]]
    else if (token.startsWith('[[') && token.endsWith(']]')) {
      const inner = token.slice(2, -2).trim();
      let targetPart = inner;
      let alias: string | undefined;

      const pipeIdx = inner.indexOf('|');
      if (pipeIdx > -1) {
        targetPart = inner.slice(0, pipeIdx).trim();
        alias = inner.slice(pipeIdx + 1).trim();
      }

      // Check if it's an internal PDF citation link
      const pdfTarget = parsePDFTarget(targetPart);
      if (pdfTarget) {
        const displayTitle = alias || targetPart;
        segments.push({
          type: 'pdflink',
          content: token,
          targetTitle: displayTitle,
          pdfId: pdfTarget.pdfId,
          pdfPage: pdfTarget.page,
          pdfHighlightId: pdfTarget.highlightId,
          alias,
        });
      } else {
        let baseTarget = targetPart;
        let targetHeading: string | undefined;

        if (targetPart.includes('#^')) {
          const parts = targetPart.split('#^');
          baseTarget = parts[0].trim();
        } else if (targetPart.includes('#')) {
          const parts = targetPart.split('#');
          baseTarget = parts[0].trim();
          targetHeading = parts[1].trim();
        }

        const res = PKMResolver.resolveLink(baseTarget, vaultIndex);
        const displayTitle = alias || res.resolvedNoteTitle || baseTarget;

        segments.push({
          type: 'wikilink',
          content: token,
          targetTitle: displayTitle,
          targetHeading,
          targetNoteId: res.resolvedNoteId,
          alias,
        });
      }
    }
    // 2. Block ID: ^block-id at end of line
    else if (token.startsWith('^')) {
      segments.push({
        type: 'blockid',
        content: token,
        blockId: token.slice(1),
      });
    }
    // 3. Inline Code: `code`
    else if (token.startsWith('`') && token.endsWith('`')) {
      segments.push({
        type: 'code',
        content: token.slice(1, -1),
      });
    }
    // 4. Inline Math: $formula$
    else if (token.startsWith('$') && token.endsWith('$') && token.length > 2) {
      const mathInner = token.slice(1, -1);
      if (isLikelyMathFormula(mathInner)) {
        segments.push({
          type: 'inlinemath',
          content: mathInner,
        });
      } else {
        segments.push({
          type: 'text',
          content: token,
        });
      }
    }
    // 5. Bold: **bold** or __bold__
    else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      segments.push({
        type: 'bold',
        content: token.slice(2, -2),
      });
    }
    // 6. Strikethrough: ~~strike~~
    else if (token.startsWith('~~') && token.endsWith('~~')) {
      segments.push({
        type: 'strike',
        content: token.slice(2, -2),
      });
    }
    // 7. Italic: *italic* or _italic_
    else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      segments.push({
        type: 'italic',
        content: token.slice(1, -1),
      });
    }
    // 8. Markdown Image: ![alt](url)
    else if (token.startsWith('![') && token.includes('](')) {
      const closeBracket = token.indexOf('](');
      const alt = token.slice(2, closeBracket);
      const url = token.slice(closeBracket + 2, -1);
      segments.push({
        type: 'image',
        content: alt,
        url,
      });
    }
    // 9. Markdown Link: [label](url)
    else if (token.startsWith('[') && token.includes('](')) {
      const closeBracket = token.indexOf('](');
      const label = token.slice(1, closeBracket);
      const url = token.slice(closeBracket + 2, -1);
      segments.push({
        type: 'mdlink',
        content: label,
        url,
      });
    }
    // 9. Tag: #tag
    else if (token.startsWith('#')) {
      segments.push({
        type: 'tag',
        content: token,
      });
    } else {
      segments.push({
        type: 'text',
        content: token,
      });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Code Block Component with copy button
 */
const CodeBlockView: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-3 rounded-xl border border-stone-300 dark:border-stone-800 bg-stone-900 text-stone-100 overflow-hidden font-mono text-xs shadow-2xs">
      <div className="px-3 py-1.5 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
        <span className="font-semibold">{language || 'text'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded hover:bg-stone-800 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/**
 * Interactive Academic Citation Inline View
 */
const CitationInlineView: React.FC<{
  rawToken: string;
  citationKey: string;
  locator?: string;
  onOpenPDF?: (pdfId: string, page?: number) => void;
}> = ({ rawToken, citationKey, locator, onOpenPDF }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [popoverPos, setPopoverPos] = React.useState<{ top: number; left: number } | null>(null);
  const containerRef = React.useRef<HTMLSpanElement>(null);

  const ref = referenceStorageService.getReferenceByCitationKey(citationKey);
  const formattedText = formatInlineCitation(ref, citationKey, locator, 'apa');
  const isMissing = !ref;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 4, left: Math.max(10, rect.left) });
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <span ref={containerRef} className="relative inline-block">
      <span
        onClick={handleClick}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded font-semibold text-xs cursor-pointer transition-colors border select-none ${
          isMissing
            ? 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-dashed border-amber-400/80 hover:bg-amber-200'
            : 'bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-700 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 shadow-2xs'
        }`}
        title={`Citation: ${rawToken}${isMissing ? ' (Reference not in vault library)' : ''}`}
      >
        <span>{formattedText}</span>
      </span>

      {isOpen && popoverPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            style={{
              position: 'fixed',
              top: Math.min(popoverPos.top, window.innerHeight - 240),
              left: Math.min(popoverPos.left, window.innerWidth - 320),
            }}
            className="z-50"
          >
            <CitationPopover
              reference={ref}
              citationKey={citationKey}
              locator={locator}
              onOpenPDF={onOpenPDF ? (pdfId) => onOpenPDF(pdfId) : undefined}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </span>
  );
};

export const PKMPreviewRenderer: React.FC<PKMPreviewRendererProps> = ({
  content,
  sourceNoteId,
  allNotes = [],
  folders = [],
  onOpenNote,
  onCreateNote,
  onOpenPDF,
  onContentChange,
  depth = 0,
  visitedChain = [],
  externalFoldState,
  onToggleExternalFold,
  onImageClick,
}) => {
  const vaultIndex = vaultManager.getIndex();

  const allNotesLookup = useMemo(() => {
    const map = new Map<string, Note>();
    for (const n of allNotes) {
      if (n) map.set(n.id, n);
    }
    return map;
  }, [allNotes]);

  // Render inline segment
  const renderInline = (segment: InlineSegment, key: string | number) => {
    switch (segment.type) {
      case 'citation':
        return (
          <CitationInlineView
            key={key}
            rawToken={segment.citationRaw || segment.content}
            citationKey={segment.citationKey || ''}
            locator={segment.locator}
            onOpenPDF={onOpenPDF}
          />
        );

      case 'pdflink':
        return (
          <span
            key={key}
            onClick={() => {
              if (segment.pdfId && onOpenPDF) {
                onOpenPDF(segment.pdfId, segment.pdfPage, segment.pdfHighlightId);
              }
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md font-semibold text-xs transition-colors cursor-pointer border bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 shadow-2xs"
            title={`Open PDF Document: ${segment.targetTitle}${segment.pdfPage ? ` (Page ${segment.pdfPage})` : ''}`}
          >
            <FileText className="w-3 h-3 stroke-[2.25] text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{segment.targetTitle}</span>
          </span>
        );

      case 'wikilink': {
        const targetNote = segment.targetNoteId ? allNotesLookup.get(segment.targetNoteId) : undefined;
        return (
          <WikiLinkPreviewPopover
            key={key}
            targetTitle={segment.targetTitle || ''}
            targetNote={targetNote}
            targetHeading={segment.targetHeading}
            alias={segment.alias}
            folders={folders}
            onOpenNote={onOpenNote}
            onCreateNote={onCreateNote}
          >
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (segment.targetNoteId && onOpenNote) {
                  onOpenNote(segment.targetNoteId);
                } else if (!segment.targetNoteId && onCreateNote) {
                  onCreateNote(segment.targetTitle || '');
                }
              }}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-xs transition-colors cursor-pointer border ${
                segment.targetNoteId
                  ? 'bg-amber-200/70 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border-amber-400/50 hover:bg-amber-300 dark:hover:bg-amber-900'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-dashed border-stone-400 hover:border-amber-500'
              }`}
              title={segment.targetNoteId ? `Open ${segment.targetTitle}` : `Note not found. Click to create.`}
            >
              <Link2 className="w-3 h-3 stroke-[2.25] text-amber-700 dark:text-amber-400" />
              <span>{segment.targetTitle}</span>
              {segment.targetHeading && (
                <span className="text-[10px] opacity-75 font-mono">#{segment.targetHeading}</span>
              )}
            </span>
          </WikiLinkPreviewPopover>
        );
      }

      case 'blockid':
        return (
          <span
            key={key}
            id={segment.blockId}
            className="inline-flex items-center px-1.5 py-0.2 mx-1 rounded bg-stone-200/80 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-mono text-[10px] select-all opacity-70 hover:opacity-100"
            title={`Block ID: ^${segment.blockId}`}
          >
            ^{segment.blockId}
          </span>
        );

      case 'code':
        return (
          <code
            key={key}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono text-xs border border-stone-300/50 dark:border-stone-700"
          >
            {segment.content}
          </code>
        );

      case 'bold':
        return (
          <strong key={key} className="font-bold text-stone-950 dark:text-white">
            {renderInlineTree(segment.content)}
          </strong>
        );

      case 'italic':
        return (
          <em key={key} className="italic">
            {renderInlineTree(segment.content)}
          </em>
        );

      case 'strike':
        return (
          <del key={key} className="line-through opacity-70">
            {renderInlineTree(segment.content)}
          </del>
        );

      case 'tag':
        return (
          <span
            key={key}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold text-xs border border-amber-300/40"
          >
            <TagIcon className="w-2.5 h-2.5" />
            {segment.content}
          </span>
        );

      case 'mdlink':
        if (segment.url && (segment.url.startsWith('pdf:') || segment.url.includes('.pdf#'))) {
          const pdfTarget = parsePDFTarget(segment.url);
          return (
            <span
              key={key}
              onClick={() => {
                if (pdfTarget && onOpenPDF) {
                  onOpenPDF(pdfTarget.pdfId, pdfTarget.page, pdfTarget.highlightId);
                }
              }}
              className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
              title={`Open PDF Citation: ${segment.content}`}
            >
              <FileText className="w-3 h-3 opacity-80" />
              <span>{segment.content}</span>
            </span>
          );
        }
        const safeHref = sanitizeUrl(segment.url);
        const isDangerous = !isSafeUrl(segment.url);
        return (
          <a
            key={key}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (isDangerous) {
                e.preventDefault();
                alert('Blocked potentially unsafe URL link scheme.');
              }
            }}
            className={`inline-flex items-center gap-0.5 ${
              isDangerous
                ? 'text-red-500 line-through cursor-not-allowed'
                : 'text-amber-700 dark:text-amber-400 hover:underline font-medium'
            }`}
            title={isDangerous ? 'Blocked unsafe URL protocol' : segment.url}
          >
            {segment.content}
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        );

      case 'image':
        return (
          <span
            key={key}
            onClick={() => onImageClick?.(segment.url || '', segment.content)}
            className={`my-3 block max-w-full rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/40 shadow-xs group ${
              onImageClick ? 'cursor-pointer hover:ring-2 hover:ring-amber-500/50 transition-all' : ''
            }`}
            title={onImageClick ? 'Click to open in note lightbox collection' : undefined}
          >
            <img
              src={segment.url}
              alt={segment.content || 'Embedded note image'}
              className="max-h-[500px] w-auto max-w-full rounded-xl object-contain mx-auto transition-transform duration-200 hover:scale-[1.01]"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div
              style={{ display: 'none' }}
              className="p-4 items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-900 italic"
            >
              <ImageIcon className="w-4 h-4 text-stone-400 shrink-0" />
              <span className="truncate">Unable to display image ({segment.content || segment.url})</span>
            </div>
            {segment.content ? (
              <span className="block text-center py-1.5 px-3 text-[11px] text-stone-500 dark:text-stone-400 bg-stone-50/80 dark:bg-stone-950/60 border-t border-stone-200/60 dark:border-stone-800/60 italic font-sans">
                {segment.content}
              </span>
            ) : null}
          </span>
        );

      case 'inlinemath':
        return <MathView key={key} expression={segment.content} displayMode={false} />;

      case 'text':
      default:
        return <React.Fragment key={key}>{segment.content}</React.Fragment>;
    }
  };

  const renderInlineTree = (text: string) => {
    const segments = parseInlineMarkdown(text, allNotesLookup, vaultIndex);
    return segments.map((seg, i) => renderInline(seg, i));
  };

  // Manage fold state
  const [internalFoldState, setInternalFoldState] = useState<NoteFoldState>(() =>
    FoldStateManager.loadFoldState(sourceNoteId)
  );

  useEffect(() => {
    setInternalFoldState(FoldStateManager.loadFoldState(sourceNoteId));
  }, [sourceNoteId]);

  const foldState = externalFoldState || internalFoldState;

  const handleToggleHeading = (secId: string) => {
    if (onToggleExternalFold) {
      onToggleExternalFold(secId);
    } else {
      const updated = FoldStateManager.toggleHeadingFold(sourceNoteId, secId, foldState);
      setInternalFoldState(updated);
    }
  };

  const handleToggleList = (lineIdx: number) => {
    const updated = FoldStateManager.toggleListFold(sourceNoteId, lineIdx, foldState);
    setInternalFoldState(updated);
  };

  const handleToggleCheckbox = (lineIndex: number) => {
    if (!onContentChange || !content || typeof content !== 'string') return;
    const allLines = content.split('\n');
    if (lineIndex < 0 || lineIndex >= allLines.length) return;
    const lineToToggle = allLines[lineIndex];
    const updatedLine = lineToToggle.replace(
      /^(\s*[-*+]\s+\[)([ xX])(\])/,
      (_, prefix, checkChar, suffix) => {
        const isCurrentlyChecked = checkChar.toLowerCase() === 'x';
        return `${prefix}${isCurrentlyChecked ? ' ' : 'x'}${suffix}`;
      }
    );
    allLines[lineIndex] = updatedLine;
    onContentChange(allLines.join('\n'));
  };

  // Block-level parsing
  const renderBlocks = useMemo(() => {
    if (!content || typeof content !== 'string') return null;

    const lines = content.split('\n');
    const { flatSections } = parseMarkdownSections(content);
    const listItems = parseNestedListItems(lines);

    const sectionByStartLine = new Map<number, typeof flatSections[0]>();
    flatSections.forEach((sec) => {
      sectionByStartLine.set(sec.startLine, sec);
    });

    const listItemByLine = new Map<number, typeof listItems[0]>();
    listItems.forEach((item) => {
      listItemByLine.set(item.lineIndex, item);
    });

    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check if current line is a heading
      const currentSec = sectionByStartLine.get(i);
      if (currentSec) {
        const level = currentSec.level;
        const headingText = currentSec.title;
        const headingSlug = currentSec.slug;
        const isFolded = foldState.foldedHeadingIds.includes(currentSec.id);
        const hasContent = currentSec.lineCount > 1;

        const innerContent = renderInlineTree(headingText);

        const foldButton = (
          <button
            type="button"
            onClick={() => handleToggleHeading(currentSec.id)}
            className="inline-flex items-center justify-center p-1 -ml-1 mr-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-md transition-colors cursor-pointer"
            title={isFolded ? 'Unfold section' : 'Fold section'}
            aria-label={isFolded ? `Unfold ${headingText}` : `Fold ${headingText}`}
          >
            {isFolded ? (
              <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 shrink-0" />
            )}
          </button>
        );

        const foldedBadge = isFolded && (
          <button
            type="button"
            onClick={() => handleToggleHeading(currentSec.id)}
            className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-medium hover:bg-amber-200/80 dark:hover:bg-amber-900/60 transition-colors cursor-pointer border border-amber-300/60 dark:border-amber-700/60"
            title="Click to expand folded section"
          >
            <span>Folded ({currentSec.lineCount - 1} lines hidden)</span>
          </button>
        );

        if (level === 1) {
          nodes.push(
            <h1
              key={`h-${i}`}
              id={headingSlug}
              data-line={i}
              className="text-xl font-bold mt-4 mb-2 pb-1 border-b border-stone-200 dark:border-stone-800 text-stone-950 dark:text-white tracking-tight flex items-center flex-wrap"
            >
              {foldButton}
              <span>{innerContent}</span>
              {foldedBadge}
            </h1>
          );
        } else if (level === 2) {
          nodes.push(
            <h2
              key={`h-${i}`}
              id={headingSlug}
              data-line={i}
              className="text-lg font-bold mt-3 mb-1.5 text-stone-950 dark:text-white tracking-tight flex items-center flex-wrap"
            >
              {foldButton}
              <span>{innerContent}</span>
              {foldedBadge}
            </h2>
          );
        } else if (level === 3) {
          nodes.push(
            <h3
              key={`h-${i}`}
              id={headingSlug}
              data-line={i}
              className="text-base font-semibold mt-2 mb-1 text-stone-950 dark:text-white tracking-tight flex items-center flex-wrap"
            >
              {foldButton}
              <span>{innerContent}</span>
              {foldedBadge}
            </h3>
          );
        } else if (level === 4) {
          nodes.push(
            <h4
              key={`h-${i}`}
              id={headingSlug}
              data-line={i}
              className="text-sm font-semibold mt-2 mb-1 text-stone-950 dark:text-white tracking-tight flex items-center flex-wrap"
            >
              {foldButton}
              <span>{innerContent}</span>
              {foldedBadge}
            </h4>
          );
        } else if (level === 5) {
          nodes.push(
            <h5
              key={`h-${i}`}
              id={headingSlug}
              data-line={i}
              className="text-xs font-semibold mt-1.5 mb-0.5 text-stone-950 dark:text-white tracking-tight flex items-center flex-wrap"
            >
              {foldButton}
              <span>{innerContent}</span>
              {foldedBadge}
            </h5>
          );
        } else {
          nodes.push(
            <h6
              key={`h-${i}`}
              id={headingSlug}
              data-line={i}
              className="text-xs font-medium mt-1 mb-0.5 text-stone-950 dark:text-white tracking-tight flex items-center flex-wrap"
            >
              {foldButton}
              <span>{innerContent}</span>
              {foldedBadge}
            </h6>
          );
        }

        // If this heading is folded, skip everything under it
        if (isFolded) {
          i = currentSec.endLine + 1;
          continue;
        }

        i++;
        continue;
      }

      // 1. Display / Block Math: $$ ... $$
      if (trimmed.startsWith('$$')) {
        // Case A: Single line $$ expression $$
        if (trimmed.endsWith('$$') && trimmed.length > 2) {
          const mathExpr = trimmed.slice(2, -2).trim();
          nodes.push(
            <div key={`math-block-${i}`} data-line={i}>
              <MathView expression={mathExpr} displayMode={true} />
            </div>
          );
          i++;
          continue;
        }

        // Case B: Multi-line $$ ... $$
        const mathLines: string[] = [];
        if (trimmed.length > 2) {
          mathLines.push(trimmed.slice(2).trim());
        }
        i++;
        while (
          i < lines.length &&
          !lines[i].trim().endsWith('$$') &&
          lines[i].trim() !== '$$'
        ) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          const endTrimmed = lines[i].trim();
          if (endTrimmed !== '$$') {
            mathLines.push(endTrimmed.replace(/\$\$$/, '').trim());
          }
          i++;
        }
        nodes.push(
          <div key={`math-block-${i}`} data-line={i}>
            <MathView
              expression={mathLines.filter(Boolean).join('\n')}
              displayMode={true}
            />
          </div>
        );
        continue;
      }

      // 2. Fenced Code Block / Mermaid / Math fences
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        const lang = trimmed.slice(3).trim().toLowerCase();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```') && !lines[i].trim().startsWith('~~~')) {
          codeLines.push(lines[i]);
          i++;
        }
        const blockCode = codeLines.join('\n');

        if (lang === 'mermaid') {
          nodes.push(
            <div key={`mermaid-${i}`} data-line={i}>
              <MermaidBlockView code={blockCode} />
            </div>
          );
        } else if (lang === 'math' || lang === 'latex' || lang === 'katex') {
          nodes.push(
            <div key={`math-code-${i}`} data-line={i}>
              <MathView expression={blockCode} displayMode={true} />
            </div>
          );
        } else if (lang === 'query' || lang === 'search') {
          nodes.push(
            <div key={`query-${i}`} data-line={i}>
              <SmartQueryBlockView
                code={blockCode}
                allNotes={allNotes}
                folders={folders}
                onOpenNote={onOpenNote}
              />
            </div>
          );
        } else if (lang === 'moc') {
          nodes.push(
            <div key={`moc-${i}`} data-line={i}>
              <MOCBlockView
                code={blockCode}
                sourceNoteId={sourceNoteId}
                allNotes={allNotes}
                folders={folders}
                onOpenNote={onOpenNote}
              />
            </div>
          );
        } else if (lang === 'bibliography' || lang === 'references' || lang === 'citations') {
          nodes.push(
            <div key={`bib-${i}`} data-line={i}>
              <BibliographyBlockView
                code={blockCode}
                sourceNoteContent={content}
                onOpenPDF={onOpenPDF}
                onOpenNote={onOpenNote}
              />
            </div>
          );
        } else {
          nodes.push(
            <div key={`code-${i}`} data-line={i}>
              <CodeBlockView language={lang} code={blockCode} />
            </div>
          );
        }
        i++;
        continue;
      }

      // 2. Transclusion Embed: ![[Target]]
      const embedMatch = trimmed.match(/^!\[\[(.*?)\]\]$/);
      if (embedMatch) {
        const rawTarget = embedMatch[1].trim();

        // Check if attachment or media reference
        const lower = rawTarget.toLowerCase();
        const isAttachmentFormat =
          rawTarget.startsWith('attachment:') ||
          rawTarget.startsWith('att-') ||
          rawTarget.startsWith('pdf-') ||
          lower.endsWith('.png') ||
          lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.webp') ||
          lower.endsWith('.gif') ||
          lower.endsWith('.svg') ||
          lower.endsWith('.mp3') ||
          lower.endsWith('.wav') ||
          lower.endsWith('.ogg') ||
          lower.endsWith('.m4a') ||
          lower.endsWith('.webm') ||
          lower.endsWith('.pdf');

        if (isAttachmentFormat) {
          nodes.push(
            <div key={`media-embed-${i}-${rawTarget}`} data-line={i}>
              <MediaEmbed
                target={rawTarget}
                onOpenPDF={onOpenPDF}
                onOpenNote={onOpenNote}
              />
            </div>
          );
          i++;
          continue;
        }

        // Live PKM Note / Section / Block Transclusion
        const transclusion = resolveTransclusion(rawTarget, sourceNoteId, vaultIndex, {
          visitedChain,
          depth,
          allNotesLookup,
        });

        // If not found in note transclusions, check if it's an attachment
        if (transclusion.status !== 'resolved') {
          nodes.push(
            <div key={`media-embed-fallback-${i}-${rawTarget}`} data-line={i}>
              <MediaEmbed
                target={rawTarget}
                onOpenPDF={onOpenPDF}
                onOpenNote={onOpenNote}
              />
            </div>
          );
          i++;
          continue;
        }

        nodes.push(
          <div key={`embed-${i}-${rawTarget}`} data-line={i}>
            <TransclusionEmbed
              transclusion={transclusion}
              onOpenNote={onOpenNote}
              onCreateNote={onCreateNote}
              visitedChain={visitedChain}
              renderChildContent={(childContent, childDepth, childChain) => (
                <PKMPreviewRenderer
                  content={childContent}
                  sourceNoteId={transclusion.targetNoteId || sourceNoteId}
                  allNotes={allNotes}
                  folders={folders}
                  onOpenNote={onOpenNote}
                  onCreateNote={onCreateNote}
                  onOpenPDF={onOpenPDF}
                  depth={childDepth}
                  visitedChain={childChain}
                />
              )}
            />
          </div>
        );
        i++;
        continue;
      }

      // Check inline transclusion embedded within a line
      if (line.includes('![[')) {
        // Line with embedded transclusion inside paragraph
        const parts = line.split(/(!\[\[.*?\]\])/g);
        nodes.push(
          <p key={`inline-embed-p-${i}`} data-line={i} className="my-1.5 leading-relaxed">
            {parts.map((p, pIdx) => {
              const m = p.match(/^!\[\[(.*?)\]\]$/);
              if (m) {
                const target = m[1].trim();
                const trans = resolveTransclusion(target, sourceNoteId, vaultIndex, {
                  visitedChain,
                  depth,
                  allNotesLookup,
                });
                return (
                  <TransclusionEmbed
                    key={`embed-inline-${pIdx}-${target}`}
                    transclusion={trans}
                    onOpenNote={onOpenNote}
                    onCreateNote={onCreateNote}
                    visitedChain={visitedChain}
                    renderChildContent={(cContent, cDepth, cChain) => (
                      <PKMPreviewRenderer
                        content={cContent}
                        sourceNoteId={trans.targetNoteId || sourceNoteId}
                        allNotes={allNotes}
                        folders={folders}
                        onOpenNote={onOpenNote}
                        onCreateNote={onCreateNote}
                        onOpenPDF={onOpenPDF}
                        depth={cDepth}
                        visitedChain={cChain}
                      />
                    )}
                  />
                );
              }
              return renderInlineTree(p);
            })}
          </p>
        );
        i++;
        continue;
      }

      // 4. Markdown Table
      if (
        trimmed.includes('|') &&
        i + 1 < lines.length &&
        isDelimiterRow(lines[i + 1])
      ) {
        const tableStartLine = i;
        const tableLines: string[] = [line, lines[i + 1]];
        i += 2;

        while (i < lines.length) {
          const rowLine = lines[i];
          const rowTrim = rowLine.trim();
          if (!rowTrim || !rowTrim.includes('|') || isDelimiterRow(rowTrim)) {
            break;
          }
          tableLines.push(rowLine);
          i++;
        }

        const tableMd = tableLines.join('\n');
        const parsedTable = parseMarkdownTable(tableMd, tableStartLine);

        if (parsedTable) {
          nodes.push(
            <div key={`table-${tableStartLine}`} data-line={tableStartLine}>
              <MarkdownTableEditor
                initialTable={parsedTable}
                onSaveTable={
                  onContentChange
                    ? (updatedTable, newMd) => {
                        const updatedDocument = replaceTableInMarkdown(
                          content,
                          parsedTable,
                          newMd
                        );
                        onContentChange(updatedDocument);
                      }
                    : undefined
                }
                onOpenNote={onOpenNote}
                onCreateNote={onCreateNote}
                readOnly={!onContentChange}
              />
            </div>
          );
        }
        continue;
      }

      // 5. Horizontal Rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        nodes.push(<hr key={`hr-${i}`} data-line={i} className="my-4 border-stone-300 dark:border-stone-800" />);
        i++;
        continue;
      }

      // 5. Callouts & Blockquotes
      if (line.startsWith('>')) {
        const parsedCalloutBlock = parseCalloutBlock(lines, i);
        if (parsedCalloutBlock) {
          const { callout, nextIndex } = parsedCalloutBlock;
          nodes.push(
            <div key={`callout-${i}`} data-line={i}>
              <CalloutView
                callout={callout}
                renderContent={(innerContent) => {
                  const innerLines = innerContent.split('\n');
                  return (
                    <div className="space-y-1">
                      {innerLines.map((il, ilIdx) => (
                        <div key={ilIdx}>{renderInlineTree(il)}</div>
                      ))}
                    </div>
                  );
                }}
              />
            </div>
          );
          i = nextIndex;
          continue;
        }

        // Fallback standard blockquote
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        nodes.push(
          <blockquote
            key={`quote-${i}`}
            data-line={i}
            className="my-2 pl-3 py-1 border-l-4 border-amber-500/80 bg-stone-100/50 dark:bg-stone-800/40 rounded-r-lg italic text-stone-800 dark:text-stone-200 text-sm"
          >
            {quoteLines.map((ql, qIdx) => (
              <div key={qIdx}>{renderInlineTree(ql)}</div>
            ))}
          </blockquote>
        );
        continue;
      }

      // 6. Checklist / Task Item with nested folding & interactive checkbox
      const currentTaskLineIndex = i;
      const taskItem = listItemByLine.get(i);
      const isListFolded = taskItem && foldState.foldedListLines.includes(i);

      const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        const indent = taskMatch[1].length;
        const isChecked = taskMatch[2].toLowerCase() === 'x';
        const taskText = taskMatch[3];

        nodes.push(
          <div
            key={`task-${currentTaskLineIndex}`}
            data-line={currentTaskLineIndex}
            className="flex items-start gap-1.5 my-1 text-sm text-stone-900 dark:text-stone-100"
            style={{ paddingLeft: `${Math.min(indent * 8, 32)}px` }}
          >
            {taskItem?.hasChildren && (
              <button
                type="button"
                onClick={() => handleToggleList(currentTaskLineIndex)}
                className="p-0.5 text-stone-400 hover:text-amber-600 rounded transition-colors mt-0.5 cursor-pointer"
                title={isListFolded ? 'Unfold sub-items' : 'Fold sub-items'}
              >
                {isListFolded ? (
                  <ChevronRight className="w-3 h-3 text-amber-600" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleToggleCheckbox(currentTaskLineIndex)}
              disabled={!onContentChange}
              className={`w-4 h-4 mt-0.5 rounded text-amber-500 accent-amber-500 shrink-0 ${
                onContentChange ? 'cursor-pointer hover:ring-1 hover:ring-amber-400' : 'pointer-events-none'
              }`}
              title={onContentChange ? (isChecked ? 'Mark incomplete' : 'Mark complete') : undefined}
            />
            <span className={isChecked ? 'line-through text-stone-400 dark:text-stone-500 flex-1' : 'flex-1'}>
              {renderInlineTree(taskText)}
            </span>
          </div>
        );

        if (isListFolded && taskItem) {
          i = taskItem.endLine + 1;
          continue;
        }

        i++;
        continue;
      }

      // 7. Unordered List item with nested folding
      const listMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (listMatch) {
        const indent = listMatch[1].length;
        const itemText = listMatch[2];

        nodes.push(
          <div
            key={`list-${i}`}
            data-line={i}
            className="flex items-start gap-1.5 my-0.5 text-sm text-stone-900 dark:text-stone-100"
            style={{ paddingLeft: `${Math.min(indent * 8, 32) + 8}px` }}
          >
            {taskItem?.hasChildren ? (
              <button
                type="button"
                onClick={() => handleToggleList(i)}
                className="p-0.5 text-stone-400 hover:text-amber-600 rounded transition-colors mt-0.5"
                title={isListFolded ? 'Unfold sub-items' : 'Fold sub-items'}
              >
                {isListFolded ? (
                  <ChevronRight className="w-3 h-3 text-amber-600" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-600 mt-2 shrink-0 ml-1 mr-1" />
            )}
            <div className="flex-1">{renderInlineTree(itemText)}</div>
          </div>
        );

        if (isListFolded && taskItem) {
          i = taskItem.endLine + 1;
          continue;
        }

        i++;
        continue;
      }

      // 8. Ordered List item with nested folding
      const ordMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (ordMatch) {
        const indent = ordMatch[1].length;
        const num = ordMatch[2];
        const itemText = ordMatch[3];

        nodes.push(
          <div
            key={`ord-${i}`}
            data-line={i}
            className="flex items-start gap-1.5 my-0.5 text-sm text-stone-900 dark:text-stone-100"
            style={{ paddingLeft: `${Math.min(indent * 8, 32) + 6}px` }}
          >
            {taskItem?.hasChildren && (
              <button
                type="button"
                onClick={() => handleToggleList(i)}
                className="p-0.5 text-stone-400 hover:text-amber-600 rounded transition-colors mt-0.5"
                title={isListFolded ? 'Unfold sub-items' : 'Fold sub-items'}
              >
                {isListFolded ? (
                  <ChevronRight className="w-3 h-3 text-amber-600" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
            <span className="font-mono text-xs text-stone-500 dark:text-stone-400 font-semibold shrink-0 mt-0.5">
              {num}.
            </span>
            <div className="flex-1">{renderInlineTree(itemText)}</div>
          </div>
        );

        if (isListFolded && taskItem) {
          i = taskItem.endLine + 1;
          continue;
        }

        i++;
        continue;
      }

      // 9. Standard Paragraph
      if (trimmed === '') {
        nodes.push(<div key={`blank-${i}`} data-line={i} className="h-2" />);
      } else {
        nodes.push(
          <p key={`p-${i}`} data-line={i} className="my-1.5 text-sm leading-relaxed text-stone-900 dark:text-stone-100">
            {renderInlineTree(line)}
          </p>
        );
      }

      i++;
    }

    return nodes;
  }, [
    content,
    sourceNoteId,
    vaultIndex,
    depth,
    visitedChain,
    allNotesLookup,
    foldState,
    onOpenNote,
    onCreateNote,
    onContentChange,
  ]);

  return <div className="space-y-0.5 font-normal select-text">{renderBlocks}</div>;
};
