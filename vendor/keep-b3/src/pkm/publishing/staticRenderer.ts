/**
 * PKM Phase P39: Static Markdown to HTML Rendering Engine
 * Translates canonical PKM Markdown into clean, accessible, semantic static HTML.
 */

import { Note, Folder } from '../../types';
import { VaultIndex, PKMHeading } from '../types';
import { parseFrontmatter, slugify, parseNote } from '../parser';
import { renderKatex, isLikelyMathFormula } from '../math';
import { parseMarkdownTable } from '../tableParser';
import { parseCalloutBlock } from '../editor';
import { resolveTransclusion, stripBlockIdsFromMarkdown } from '../transclusion';
import { parseSmartQuery } from '../queryParser';
import { executeSmartQuery } from '../queryEngine';
import { referenceStorageService } from '../reference/referenceStorageService';
import { formatInlineCitation, formatBibliographyEntry } from '../reference/citationFormatter';
import { Reference } from '../reference/referenceTypes';
import {
  Publication,
  ResolvedPublicationSnapshot,
} from './publishingTypes';
import { generateHeadingSlug, getRelativeNoteUrl } from './publicationSlug';

export interface StaticRenderContext {
  snapshot: ResolvedPublicationSnapshot;
  currentNote: Note;
  currentSlug: string;
  isSingleHtmlMode?: boolean;
  depth?: number;
  visitedChain?: string[];
}

export interface RenderedNoteOutput {
  html: string;
  tableOfContentsHtml: string;
  backlinksHtml: string;
  propertiesHtml: string;
  bibliographyHtml: string;
  headings: PKMHeading[];
  plainTextExcerpt: string;
}

/**
 * Escapes HTML characters safely
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips Cloze deletions: {{c1::hidden text}} -> hidden text
 */
export function revealClozeDeletions(text: string): string {
  if (!text) return '';
  return text.replace(/\{\{c\d+::([^:}]+)(?:::[^}]*)?\}\}/g, '$1');
}

/**
 * Sanitizes markdown content for publication
 */
export function sanitizeMarkdownForPublishing(
  rawContent: string,
  options: { hidePrivateTags?: boolean; excludeTags?: string[] } = {}
): { content: string; metadata: Record<string, any> } {
  const { frontmatter, body } = parseFrontmatter(rawContent || '');
  let sanitized = revealClozeDeletions(body);

  // Strip block IDs e.g. ^block-id at end of lines
  sanitized = stripBlockIdsFromMarkdown(sanitized);

  // Strip private tags if configured
  if (options.hidePrivateTags && options.excludeTags && options.excludeTags.length > 0) {
    for (const tag of options.excludeTags) {
      const cleanTag = tag.replace(/^#/, '');
      const regex = new RegExp(`(?:^|\\s)#${cleanTag}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '');
    }
  }

  return { content: sanitized, metadata: (frontmatter as Record<string, any>) || {} };
}

/**
 * Renders inline formatting: wikilinks, citations, math, tags, bold, italic, code, links
 */
export function renderInlineMarkdown(
  text: string,
  ctx: StaticRenderContext
): string {
  if (!text) return '';

  let out = '';
  // Tokenizer regex matching wikilinks, citations, markdown links, inline math, code, bold, italic, strike, tags
  const tokenRegex =
    /(\[\^?[a-zA-Z0-9_:.-]+\]|!\[\[[^\]]+\]\]|\[\[[^\]]+\]\]|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\$\$([^$]+)\$\$|\$([^$\n]+)\$|\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|~~([^~]+)~~|#([a-zA-Z0-9_\-\/]+))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      out += escapeHtml(text.substring(lastIndex, start));
    }
    lastIndex = tokenRegex.lastIndex;

    const fullMatch = match[0];

    // 1. Citation: [@key] or [@key, p. 42]
    if (fullMatch.startsWith('[@') && fullMatch.endsWith(']')) {
      const inside = fullMatch.substring(2, fullMatch.length - 1);
      const commaIdx = inside.indexOf(',');
      const key = commaIdx >= 0 ? inside.substring(0, commaIdx).trim() : inside.trim();
      const locator = commaIdx >= 0 ? inside.substring(commaIdx + 1).trim() : undefined;

      const ref = referenceStorageService.getReferenceByCitationKey(key);
      const citationText = formatInlineCitation(ref, key, locator, 'apa');
      out += `<a href="#ref-${escapeHtml(key)}" class="citation-link" title="${escapeHtml(ref?.title || key)}">${escapeHtml(citationText)}</a>`;
      continue;
    }

    // 2. Wikilinks: [[Target|Alias]]
    if (fullMatch.startsWith('[[') && fullMatch.endsWith(']]')) {
      const inside = fullMatch.substring(2, fullMatch.length - 2).trim();
      const pipeIdx = inside.indexOf('|');
      let rawTarget = pipeIdx >= 0 ? inside.substring(0, pipeIdx).trim() : inside;
      const alias = pipeIdx >= 0 ? inside.substring(pipeIdx + 1).trim() : undefined;

      // Check heading anchor: Note#Heading
      let headingPart = '';
      let blockPart = '';
      if (rawTarget.includes('#^')) {
        const parts = rawTarget.split('#^');
        rawTarget = parts[0];
        blockPart = parts[1];
      } else if (rawTarget.includes('#')) {
        const parts = rawTarget.split('#');
        rawTarget = parts[0];
        headingPart = parts[1];
      }

      const targetTitle = rawTarget.trim();
      const displayText = alias || targetTitle || (headingPart ? `#${headingPart}` : 'Link');

      // Find matching note in published snapshot
      let targetNote: Note | undefined;
      if (targetTitle) {
        targetNote = ctx.snapshot.primaryNotes.find(
          (n) => (n.title || '').toLowerCase().trim() === targetTitle.toLowerCase()
        );
      } else {
        targetNote = ctx.currentNote;
      }

      if (targetNote && ctx.snapshot.slugMap.has(targetNote.id)) {
        const targetSlug = ctx.snapshot.slugMap.get(targetNote.id)!;
        const relativeUrl = getRelativeNoteUrl(
          targetSlug,
          ctx.currentSlug,
          ctx.snapshot.publication.output.basePath,
          ctx.isSingleHtmlMode
        );

        let finalHref = relativeUrl;
        if (headingPart) {
          finalHref += `#${generateHeadingSlug(headingPart)}`;
        } else if (blockPart) {
          finalHref += `#${escapeHtml(blockPart)}`;
        }

        out += `<a href="${finalHref}" class="internal-link" data-slug="${escapeHtml(targetSlug)}" title="${escapeHtml(targetNote.title || 'Note')}">${escapeHtml(displayText)}</a>`;
      } else {
        // Target is outside publication scope or missing
        out += `<span class="unpublished-link" title="Note not in this publication">${escapeHtml(displayText)}</span>`;
      }
      continue;
    }

    // 3. Markdown Link: [Label](url)
    if (match[2] !== undefined && match[3] !== undefined) {
      const label = match[2];
      const url = match[3];
      const isExternal = /^https?:\/\//i.test(url);
      out += `<a href="${escapeHtml(url)}" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''} class="${isExternal ? 'external-link' : 'inline-link'}">${escapeHtml(label)}</a>`;
      continue;
    }

    // 4. Inline Code: `code`
    if (match[4] !== undefined) {
      out += `<code>${escapeHtml(match[4])}</code>`;
      continue;
    }

    // 5. Block Math: $$formula$$
    if (match[5] !== undefined) {
      const mathResult = renderKatex(match[5], true);
      out += `<div class="katex-display">${mathResult.html}</div>`;
      continue;
    }

    // 6. Inline Math: $formula$
    if (match[6] !== undefined) {
      if (isLikelyMathFormula(match[6])) {
        const mathResult = renderKatex(match[6], false);
        out += `<span class="katex-inline">${mathResult.html}</span>`;
      } else {
        out += `$${escapeHtml(match[6])}$`;
      }
      continue;
    }

    // 7. Bold: **text**
    if (match[7] !== undefined) {
      out += `<strong>${renderInlineMarkdown(match[7], ctx)}</strong>`;
      continue;
    }

    // 8. Italic: *text* or __text__
    if (match[8] !== undefined || match[9] !== undefined) {
      const italicText = match[8] || match[9] || '';
      out += `<em>${renderInlineMarkdown(italicText, ctx)}</em>`;
      continue;
    }

    // 9. Strikethrough: ~~text~~
    if (match[10] !== undefined) {
      out += `<del>${renderInlineMarkdown(match[10], ctx)}</del>`;
      continue;
    }

    // 10. Tag: #tag
    if (match[11] !== undefined) {
      const tag = match[11];
      out += `<span class="tag-badge">#${escapeHtml(tag)}</span>`;
      continue;
    }

    out += escapeHtml(fullMatch);
  }

  if (lastIndex < text.length) {
    out += escapeHtml(text.substring(lastIndex));
  }

  return out;
}

/**
 * Renders a full Markdown note into static HTML
 */
export function renderNoteToStaticHtml(
  note: Note,
  ctx: StaticRenderContext
): RenderedNoteOutput {
  const depth = ctx.depth || 0;
  const visitedChain = ctx.visitedChain || [note.id];

  const { content, metadata } = sanitizeMarkdownForPublishing(
    note.content || '',
    {
      hidePrivateTags: ctx.snapshot.publication.options.hidePrivateTags,
      excludeTags: ctx.snapshot.publication.source.excludeTags,
    }
  );

  const lines = content.split('\n');
  const headings: PKMHeading[] = [];
  const bodyHtmlParts: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];
  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushCodeBlock = () => {
    if (inCodeBlock) {
      const rawCode = codeBlockContent.join('\n');
      const lang = codeBlockLang.toLowerCase().trim();

      // Check if it's a dynamic Smart Query block: ```query ... ```
      if (lang === 'query') {
        try {
          const parsedRes = parseSmartQuery(rawCode);
          if (parsedRes && !parsedRes.error && parsedRes.ast) {
            // Execute query ONLY against the published notes snapshot!
            const evalResult = executeSmartQuery(parsedRes.ast, {
              notes: ctx.snapshot.allPublishedNotes,
            });

            if (evalResult.items.length === 0) {
              bodyHtmlParts.push(
                `<div class="query-block-container empty"><p class="query-empty-notice">No matching notes found in this publication.</p></div>`
              );
            } else {
              // Render static query table
              let queryTable = `<div class="query-block-container"><table class="query-table"><thead><tr><th>Title</th><th>Tags</th><th>Updated</th></tr></thead><tbody>`;
              for (const item of evalResult.items) {
                const itemSlug = ctx.snapshot.slugMap.get(item.note.id);
                const link = itemSlug
                  ? `<a href="${getRelativeNoteUrl(itemSlug, ctx.currentSlug, ctx.snapshot.publication.output.basePath, ctx.isSingleHtmlMode)}" class="internal-link">${escapeHtml(item.note.title || 'Untitled')}</a>`
                  : escapeHtml(item.note.title || 'Untitled');
                const tagBadges = (item.note.tags || [])
                  .map((t) => `<span class="tag-badge">#${escapeHtml(t)}</span>`)
                  .join(' ');
                const updatedStr = item.note.updatedAt ? new Date(item.note.updatedAt).toLocaleDateString() : '';
                queryTable += `<tr><td>${link}</td><td>${tagBadges}</td><td>${updatedStr}</td></tr>`;
              }
              queryTable += `</tbody></table></div>`;
              bodyHtmlParts.push(queryTable);
            }
          }
        } catch (err) {
          bodyHtmlParts.push(`<pre><code class="language-query">${escapeHtml(rawCode)}</code></pre>`);
        }
      } else if (lang === 'math' || lang === 'latex') {
        const mathRes = renderKatex(rawCode, true);
        bodyHtmlParts.push(`<div class="katex-display">${mathRes.html}</div>`);
      } else {
        bodyHtmlParts.push(
          `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(rawCode)}</code></pre>`
        );
      }

      inCodeBlock = false;
      codeBlockLang = '';
      codeBlockContent = [];
    }
  };

  const flushTable = () => {
    if (inTable) {
      const parsedTable = parseMarkdownTable(tableLines.join('\n'));
      if (parsedTable && parsedTable.headers.length > 0) {
        let tableHtml = `<div class="table-container"><table class="markdown-table"><thead><tr>`;
        parsedTable.headers.forEach((h, colIdx) => {
          const align = parsedTable.alignments[colIdx] || 'left';
          tableHtml += `<th style="text-align: ${align}">${renderInlineMarkdown(h, ctx)}</th>`;
        });
        tableHtml += `</tr></thead><tbody>`;
        parsedTable.rows.forEach((row) => {
          tableHtml += `<tr>`;
          row.forEach((cell, colIdx) => {
            const align = parsedTable.alignments[colIdx] || 'left';
            tableHtml += `<td style="text-align: ${align}">${renderInlineMarkdown(cell, ctx)}</td>`;
          });
          tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table></div>`;
        bodyHtmlParts.push(tableHtml);
      }
      inTable = false;
      tableLines = [];
    }
  };

  const flushBlockquote = () => {
    if (inBlockquote) {
      if (blockquoteLines.length > 0 && blockquoteLines[0].trim().startsWith('> [')) {
        const parsed = parseCalloutBlock(blockquoteLines, 0);
        if (parsed) {
          const callout = parsed.callout;
          const typeClass = `callout-${callout.type.toLowerCase()}`;
          const titleText = callout.title || callout.type.toUpperCase();
          bodyHtmlParts.push(
            `<div class="callout ${typeClass}"><div class="callout-header"><span class="callout-title">${escapeHtml(titleText)}</span></div><div class="callout-body">${renderInlineMarkdown(callout.content, ctx)}</div></div>`
          );
        } else {
          bodyHtmlParts.push(
            `<blockquote>${blockquoteLines.map((l) => renderInlineMarkdown(l.replace(/^>\s?/, ''), ctx)).join('<br/>')}</blockquote>`
          );
        }
      } else {
        bodyHtmlParts.push(
          `<blockquote>${blockquoteLines.map((l) => renderInlineMarkdown(l.replace(/^>\s?/, ''), ctx)).join('<br/>')}</blockquote>`
        );
      }
      inBlockquote = false;
      blockquoteLines = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check Code Block Fences
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushTable();
        flushBlockquote();
        inCodeBlock = true;
        codeBlockLang = line.trim().substring(3).trim();
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      i++;
      continue;
    }

    // Check Blockquotes / Callouts
    if (line.trim().startsWith('>')) {
      flushTable();
      inBlockquote = true;
      blockquoteLines.push(line);
      i++;
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // Check Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      tableLines.push(line);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Check Transclusions: ![[Target]]
    const transMatch = line.trim().match(/^!\[\[([^\]]+)\]\]$/);
    if (transMatch) {
      const rawEmbedTarget = transMatch[1];
      if (/\.(png|jpe?g|gif|webp|svg)$/i.test(rawEmbedTarget)) {
        // Image embed
        bodyHtmlParts.push(
          `<figure class="media-figure"><img src="assets/${escapeHtml(rawEmbedTarget)}" alt="${escapeHtml(rawEmbedTarget)}" class="published-image" loading="lazy" /></figure>`
        );
      } else if (/\.(mp3|wav|m4a|ogg)$/i.test(rawEmbedTarget)) {
        // Audio embed
        bodyHtmlParts.push(
          `<audio controls class="published-audio"><source src="assets/${escapeHtml(rawEmbedTarget)}" />Your browser does not support the audio element.</audio>`
        );
      } else {
        // Note transclusion embed
        const resolved = resolveTransclusion(
          rawEmbedTarget,
          note.id,
          ctx.snapshot.vaultIndex,
          {
            depth,
            visitedChain,
          }
        );

        if (resolved.status === 'resolved' && resolved.targetNoteId) {
          const targetNote = ctx.snapshot.noteById.get(resolved.targetNoteId);
          if (targetNote) {
            const nestedRender = renderNoteToStaticHtml(
              {
                ...targetNote,
                content: resolved.content,
              },
              {
                ...ctx,
                depth: depth + 1,
                visitedChain: [...visitedChain, targetNote.id],
              }
            );
            bodyHtmlParts.push(
              `<div class="transclusion-embed"><div class="transclusion-header"><span class="transclusion-title">Embedded: ${escapeHtml(targetNote.title || 'Note')}</span></div><div class="transclusion-content">${nestedRender.html}</div></div>`
            );
          }
        } else if (resolved.status === 'circular_dependency') {
          bodyHtmlParts.push(
            `<div class="transclusion-error">Circular embed reference ignored: ${escapeHtml(rawEmbedTarget)}</div>`
          );
        } else {
          bodyHtmlParts.push(
            `<div class="transclusion-fallback">Embedded note unavailable: ${escapeHtml(rawEmbedTarget)}</div>`
          );
        }
      }
      i++;
      continue;
    }

    // Check Headings # .. ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const slug = generateHeadingSlug(headingText);
      headings.push({
        level,
        text: headingText,
        raw: headingText,
        line: i + 1,
        charOffset: 0,
        slug,
      });

      const headingHtml = `<h${level} id="${slug}" class="heading-anchor-group"><a href="#${slug}" class="heading-anchor" aria-hidden="true">#</a>${renderInlineMarkdown(headingText, ctx)}</h${level}>`;
      bodyHtmlParts.push(headingHtml);
      i++;
      continue;
    }

    // Check Task Lists: - [ ] or - [x]
    const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const indent = taskMatch[1].length;
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const itemText = taskMatch[3];
      bodyHtmlParts.push(
        `<div class="task-item ${isChecked ? 'completed' : ''}" style="margin-left: ${indent * 12}px"><input type="checkbox" disabled ${isChecked ? 'checked' : ''} class="task-checkbox" /><span class="task-text">${renderInlineMarkdown(itemText, ctx)}</span></div>`
      );
      i++;
      continue;
    }

    // Check Standard Lists: - or * or 1.
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const bullet = listMatch[2];
      const itemText = listMatch[3];
      bodyHtmlParts.push(
        `<li class="list-item" style="margin-left: ${indent * 12}px">${renderInlineMarkdown(itemText, ctx)}</li>`
      );
      i++;
      continue;
    }

    // Check Horizontal Rule: --- or ***
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      bodyHtmlParts.push('<hr class="divider" />');
      i++;
      continue;
    }

    // Regular Paragraph
    if (line.trim()) {
      bodyHtmlParts.push(`<p>${renderInlineMarkdown(line, ctx)}</p>`);
    }

    i++;
  }

  // Flush remaining blocks
  flushCodeBlock();
  flushTable();
  flushBlockquote();

  // 1. Table of Contents HTML
  let tableOfContentsHtml = '';
  if (headings.length > 1 && ctx.snapshot.publication.options.includeTableOfContents) {
    tableOfContentsHtml = `<nav class="table-of-contents" aria-label="Table of Contents"><div class="toc-title">On this page</div><ul class="toc-list">`;
    headings.forEach((h) => {
      tableOfContentsHtml += `<li class="toc-item toc-level-${h.level}"><a href="#${h.slug}" class="toc-link">${escapeHtml(h.text)}</a></li>`;
    });
    tableOfContentsHtml += `</ul></nav>`;
  }

  // 2. Backlinks HTML (Strictly publication scoped!)
  let backlinksHtml = '';
  if (ctx.snapshot.publication.options.includeBacklinks) {
    const linkingNotes: Note[] = [];
    for (const otherNote of ctx.snapshot.primaryNotes) {
      if (otherNote.id === note.id) continue;
      const otherContent = (otherNote.content || '').toLowerCase();
      const thisTitle = (note.title || '').toLowerCase().trim();
      if (thisTitle && otherContent.includes(`[[${thisTitle}`)) {
        linkingNotes.push(otherNote);
      }
    }

    if (linkingNotes.length > 0) {
      backlinksHtml = `<section class="backlinks-section"><h3 class="backlinks-title">Linked References</h3><ul class="backlinks-list">`;
      linkingNotes.forEach((linking) => {
        const linkingSlug = ctx.snapshot.slugMap.get(linking.id)!;
        const href = getRelativeNoteUrl(
          linkingSlug,
          ctx.currentSlug,
          ctx.snapshot.publication.output.basePath,
          ctx.isSingleHtmlMode
        );
        backlinksHtml += `<li class="backlink-item"><a href="${href}" class="internal-link">${escapeHtml(linking.title || 'Untitled')}</a></li>`;
      });
      backlinksHtml += `</ul></section>`;
    }
  }

  // 3. Properties / Frontmatter Allowlist HTML
  let propertiesHtml = '';
  const allowlist = ctx.snapshot.publication.options.propertyAllowlist || [];
  if (allowlist.length > 0 && metadata) {
    const exposedProps: Array<{ key: string; value: string }> = [];
    for (const key of allowlist) {
      if (metadata[key] !== undefined) {
        const val = metadata[key];
        const valStr = Array.isArray(val) ? val.join(', ') : String(val);
        exposedProps.push({ key, value: valStr });
      }
    }

    if (exposedProps.length > 0) {
      propertiesHtml = `<div class="properties-banner"><div class="properties-grid">`;
      exposedProps.forEach((p) => {
        propertiesHtml += `<div class="property-badge"><span class="property-key">${escapeHtml(p.key)}:</span> <span class="property-value">${escapeHtml(p.value)}</span></div>`;
      });
      propertiesHtml += `</div></div>`;
    }
  }

  // 4. Bibliography HTML
  let bibliographyHtml = '';
  if (ctx.snapshot.publication.options.includeBibliography) {
    const noteCitations = (note.content || '').match(/\[@([a-zA-Z0-9_:.-]+)\]/g);
    if (noteCitations && noteCitations.length > 0) {
      const keys = Array.from(new Set(noteCitations.map((c) => c.replace(/^\[@|\]$/g, ''))));
      const refs: Reference[] = [];
      keys.forEach((k) => {
        const ref = referenceStorageService.getReferenceByCitationKey(k);
        if (ref) refs.push(ref);
      });

      if (refs.length > 0) {
        bibliographyHtml = `<section class="bibliography-section"><h3 class="bibliography-title">References & Citations</h3><ol class="bibliography-list">`;
        refs.forEach((ref) => {
          const entry = formatBibliographyEntry(ref, 'apa');
          bibliographyHtml += `<li id="ref-${escapeHtml(ref.citationKey)}" class="bibliography-entry">${escapeHtml(entry)}</li>`;
        });
        bibliographyHtml += `</ol></section>`;
      }
    }
  }

  const plainTextExcerpt = content
    .replace(/[#*`_~[\](){}<>!|\\/@:;=+^%&$?"',.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160);

  return {
    html: bodyHtmlParts.join('\n'),
    tableOfContentsHtml,
    backlinksHtml,
    propertiesHtml,
    bibliographyHtml,
    headings,
    plainTextExcerpt,
  };
}
