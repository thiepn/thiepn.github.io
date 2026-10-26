/**
 * PKM V1.8: Standalone Self-Contained HTML Transformer
 * Generates an accessible, offline HTML document with embedded CSS, math, and print styles.
 */

import { Note, Folder } from '../../types';
import { ExportScopeConfig } from './exportTypes';
import { renderInlineMarkdown, escapeHtml } from '../publishing/staticRenderer';
import { renderKatex, isLikelyMathFormula } from '../math';
import { parseMarkdownTable } from '../tableParser';
import { parseCalloutBlock } from '../editor';
import { redactSecretsFromMarkdown } from './privacyScanner';
import { revealClozeDeletions } from '../publishing';

/**
 * Embedded CSS styles for Standalone HTML document
 */
function getStandaloneEmbeddedCss(theme: string = 'light'): string {
  return `
/* PKM Standalone HTML Theme */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-surface: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  --accent-color: #2563eb;
  --accent-hover: #1d4ed8;
  --code-bg: #f8fafc;
  --callout-info-bg: #eff6ff;
  --callout-info-border: #3b82f6;
  --callout-warn-bg: #fefce8;
  --callout-warn-border: #eab308;
  --callout-error-bg: #fef2f2;
  --callout-error-border: #ef4444;
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-surface: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --border-color: #334155;
  --accent-color: #38bdf8;
  --accent-hover: #7dd3fc;
  --code-bg: #1e293b;
  --callout-info-bg: #172554;
  --callout-info-border: #3b82f6;
  --callout-warn-bg: #422006;
  --callout-warn-border: #ca8a04;
  --callout-error-bg: #450a0a;
  --callout-error-border: #dc2626;
}

[data-theme="sepia"] {
  --bg-primary: #fbf7ee;
  --bg-secondary: #f4ecd8;
  --bg-surface: #ebe0c3;
  --text-primary: #433422;
  --text-secondary: #63503a;
  --text-muted: #846f56;
  --border-color: #decfae;
  --accent-color: #9c4221;
  --accent-hover: #7c2d12;
  --code-bg: #f4ecd8;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.65;
  font-size: 16px;
  padding: 2.5rem 1.5rem;
}

.document-container {
  max-width: 800px;
  margin: 0 auto;
}

/* Header & Metadata */
.doc-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}
.doc-title {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.25;
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
}
.doc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}
.doc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}
.tag-badge {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
}

/* Theme Toolbar (interactive when JavaScript enabled) */
.theme-bar {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.theme-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}
.theme-btn:hover {
  background: var(--bg-surface);
}

/* Typography & Content */
h1, h2, h3, h4, h5, h6 {
  color: var(--text-primary);
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
}
h1 { font-size: 1.85rem; }
h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3rem; }
h3 { font-size: 1.25rem; }
h4 { font-size: 1.1rem; }

p { margin-bottom: 1.1rem; }
a { color: var(--accent-color); text-decoration: none; }
a:hover { text-decoration: underline; }

ul, ol { margin-bottom: 1.1rem; padding-left: 1.5rem; }
li { margin-bottom: 0.35rem; }

/* Task Checkboxes */
.task-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}
.task-item input {
  margin-top: 0.3rem;
}
.task-item.completed span {
  text-decoration: line-through;
  color: var(--text-muted);
}

/* Code & Pre */
pre {
  background: var(--code-bg);
  border: 1px solid var(--border-color);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 1.25rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
}
code {
  font-family: var(--font-mono);
  background: var(--code-bg);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.9em;
}

/* Tables */
.table-container {
  overflow-x: auto;
  margin-bottom: 1.25rem;
}
table.markdown-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
table.markdown-table th, table.markdown-table td {
  border: 1px solid var(--border-color);
  padding: 0.6rem 0.8rem;
  text-align: left;
}
table.markdown-table th {
  background: var(--bg-secondary);
  font-weight: 600;
}
table.markdown-table tr:nth-child(even) td {
  background: var(--bg-secondary);
}

/* Callouts */
.callout {
  border-left: 4px solid var(--callout-info-border);
  background: var(--callout-info-bg);
  padding: 0.9rem 1.1rem;
  border-radius: 0 6px 6px 0;
  margin-bottom: 1.25rem;
}
.callout.callout-warning {
  border-left-color: var(--callout-warn-border);
  background: var(--callout-warn-bg);
}
.callout.callout-danger, .callout.callout-error {
  border-left-color: var(--callout-error-border);
  background: var(--callout-error-bg);
}
.callout-title {
  font-weight: 600;
  margin-bottom: 0.35rem;
}

/* Blockquotes */
blockquote {
  border-left: 3px solid var(--border-color);
  padding-left: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1.25rem;
  font-style: italic;
}

/* Table of Contents */
.toc-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
}
.toc-title {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}
.toc-list {
  list-style: none;
  padding-left: 0;
  margin-bottom: 0;
}
.toc-level-1 { padding-left: 0; }
.toc-level-2 { padding-left: 1rem; }
.toc-level-3 { padding-left: 2rem; }

/* Print Optimization */
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
    font-size: 11pt;
    padding: 0;
    line-height: 1.4;
  }
  .theme-bar, .no-print {
    display: none !important;
  }
  a {
    color: #000000 !important;
    text-decoration: underline;
  }
  a[href^="http"]:after {
    content: " (" attr(href) ")";
    font-size: 80%;
  }
  h1, h2, h3 {
    page-break-after: avoid;
    break-after: avoid;
  }
  pre, blockquote, table, figure {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  h2 {
    page-break-before: auto;
  }
}
`;
}

/**
 * Transforms a single note into a standalone self-contained HTML document.
 */
export function generateStandaloneHtml(
  note: Note,
  config: ExportScopeConfig,
  allNotes: Note[] = []
): string {
  const allNotesMap = new Map<string, Note>(allNotes.map((n) => [n.id, n]));

  // 1. Sanitize & Prepare Content
  let content = note.content || '';
  content = revealClozeDeletions(content);
  if (config.maskSensitiveData) {
    content = redactSecretsFromMarkdown(content);
  }

  const lines = content.split('\n');
  const bodyHtmlParts: string[] = [];
  const headings: Array<{ level: number; text: string; slug: string }> = [];

  // Dummy ctx for static renderer
  const ctx: any = {
    snapshot: {
      primaryNotes: allNotes,
      allPublishedNotes: allNotes,
      slugMap: new Map(),
      publication: {
        output: { basePath: './' },
        options: config,
        source: { excludeTags: config.excludeTags },
      },
    },
    currentNote: note,
    currentSlug: note.id,
    isSingleHtmlMode: true,
  };

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];
  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushCode = () => {
    if (inCodeBlock) {
      const code = codeBlockLines.join('\n');
      const lang = codeBlockLang.toLowerCase();
      if (lang === 'math' || lang === 'latex') {
        const math = renderKatex(code, true);
        bodyHtmlParts.push(`<div class="katex-display">${math.html}</div>`);
      } else {
        bodyHtmlParts.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`);
      }
      inCodeBlock = false;
      codeBlockLang = '';
      codeBlockLines = [];
    }
  };

  const flushTable = () => {
    if (inTable) {
      const parsed = parseMarkdownTable(tableLines.join('\n'));
      if (parsed && parsed.headers.length > 0) {
        let tableHtml = `<div class="table-container"><table class="markdown-table"><thead><tr>`;
        parsed.headers.forEach((h, col) => {
          const align = parsed.alignments[col] || 'left';
          tableHtml += `<th style="text-align: ${align}">${renderInlineMarkdown(h, ctx)}</th>`;
        });
        tableHtml += `</tr></thead><tbody>`;
        parsed.rows.forEach((row) => {
          tableHtml += `<tr>`;
          row.forEach((cell, col) => {
            const align = parsed.alignments[col] || 'left';
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
          const c = parsed.callout;
          const typeClass = `callout-${c.type.toLowerCase()}`;
          const title = c.title || c.type.toUpperCase();
          bodyHtmlParts.push(
            `<div class="callout ${typeClass}"><div class="callout-title">${escapeHtml(title)}</div><div>${renderInlineMarkdown(c.content, ctx)}</div></div>`
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

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
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
      codeBlockLines.push(line);
      i++;
      continue;
    }

    if (line.trim().startsWith('>')) {
      flushTable();
      inBlockquote = true;
      blockquoteLines.push(line);
      i++;
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      tableLines.push(line);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `h-${i}`;
      headings.push({ level, text, slug });
      bodyHtmlParts.push(`<h${level} id="${slug}">${renderInlineMarkdown(text, ctx)}</h${level}>`);
      i++;
      continue;
    }

    // Task Items
    const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const text = taskMatch[3];
      bodyHtmlParts.push(
        `<div class="task-item ${isChecked ? 'completed' : ''}"><input type="checkbox" disabled ${isChecked ? 'checked' : ''} /><span>${renderInlineMarkdown(text, ctx)}</span></div>`
      );
      i++;
      continue;
    }

    // Standard list items
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      bodyHtmlParts.push(`<li>${renderInlineMarkdown(listMatch[3], ctx)}</li>`);
      i++;
      continue;
    }

    if (line.trim()) {
      bodyHtmlParts.push(`<p>${renderInlineMarkdown(line, ctx)}</p>`);
    }

    i++;
  }

  flushCode();
  flushTable();
  flushBlockquote();

  // TOC
  let tocHtml = '';
  if (config.includeTableOfContents && headings.length > 1) {
    tocHtml = `<nav class="toc-box" aria-label="Table of Contents"><div class="toc-title">Table of Contents</div><ul class="toc-list">`;
    headings.forEach((h) => {
      tocHtml += `<li class="toc-item toc-level-${h.level}"><a href="#${h.slug}">${escapeHtml(h.text)}</a></li>`;
    });
    tocHtml += `</ul></nav>`;
  }

  // Tags badge list
  const tagsHtml = (note.tags || []).map((t) => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join(' ');

  return `<!DOCTYPE html>
<html lang="en" data-theme="${escapeHtml(config.theme || 'light')}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(note.title || 'Untitled Note')}</title>
  <style>
${getStandaloneEmbeddedCss(config.theme)}
  </style>
</head>
<body>
  <div class="document-container">
    <div class="theme-bar no-print">
      <button class="theme-btn" onclick="document.documentElement.setAttribute('data-theme', 'light')">Light</button>
      <button class="theme-btn" onclick="document.documentElement.setAttribute('data-theme', 'sepia')">Sepia</button>
      <button class="theme-btn" onclick="document.documentElement.setAttribute('data-theme', 'dark')">Dark</button>
      <button class="theme-btn" onclick="window.print()">Print / PDF</button>
    </div>

    <header class="doc-header">
      <h1 class="doc-title">${escapeHtml(note.title || 'Untitled Note')}</h1>
      <div class="doc-meta">
        <span>Created: ${new Date(note.createdAt).toLocaleDateString()}</span>
        <span>Updated: ${new Date(note.updatedAt).toLocaleDateString()}</span>
      </div>
      ${tagsHtml ? `<div class="doc-tags">${tagsHtml}</div>` : ''}
    </header>

    ${tocHtml}

    <main class="doc-body">
      ${bodyHtmlParts.join('\n')}
    </main>
  </div>
</body>
</html>`;
}
