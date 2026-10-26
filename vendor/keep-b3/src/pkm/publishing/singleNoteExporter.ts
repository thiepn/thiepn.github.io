/**
 * PKM Phase P39: Single-Note Exporter
 * Generates standalone self-contained HTML files, Markdown ZIP packages, and print-optimized views.
 */

import JSZip from 'jszip';
import { Note, Folder } from '../../types';
import { renderNoteToStaticHtml, escapeHtml, sanitizeMarkdownForPublishing } from './staticRenderer';
import { resolvePublicationSnapshot } from './publicationSourceResolver';
import { publicationStorage } from './publicationStorage';

export interface SingleNoteExportOptions {
  theme?: 'light' | 'dark' | 'auto' | 'sepia';
  includeTableOfContents?: boolean;
  includeBibliography?: boolean;
  includeBacklinks?: boolean;
  propertyAllowlist?: string[];
  hidePrivateTags?: boolean;
  customCss?: string;
}

/**
 * Returns standalone CSS stylesheet with responsive typography, themes, and print styles
 */
export function getStandaloneHtmlCss(theme: 'light' | 'dark' | 'auto' | 'sepia' = 'auto', customCss = ''): string {
  return `
/* Base & Typography */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --accent-color: #2563eb;
  --accent-hover: #1d4ed8;
  --code-bg: #f1f5f9;
  --callout-note-bg: #eff6ff;
  --callout-note-border: #3b82f6;
  --callout-warn-bg: #fffbeb;
  --callout-warn-border: #f59e0b;
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --border-color: #334155;
  --accent-color: #38bdf8;
  --accent-hover: #7dd3fc;
  --code-bg: #1e293b;
  --callout-note-bg: #1e293b;
  --callout-note-border: #38bdf8;
  --callout-warn-bg: #292524;
  --callout-warn-border: #f59e0b;
}

[data-theme="sepia"] {
  --bg-primary: #fbf0d9;
  --bg-secondary: #f4e3c1;
  --bg-tertiary: #ebd4a7;
  --text-primary: #433422;
  --text-secondary: #5f4b32;
  --text-muted: #8b7355;
  --border-color: #dcc194;
  --accent-color: #8b4513;
  --accent-hover: #5c2d0c;
  --code-bg: #f4e3c1;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme="sepia"]) {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-muted: #64748b;
    --border-color: #334155;
    --accent-color: #38bdf8;
    --accent-hover: #7dd3fc;
    --code-bg: #1e293b;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.65;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  padding: 2rem 1rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background-color: var(--bg-primary);
}

.header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.note-title {
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1.25;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.note-meta {
  font-size: 0.875rem;
  color: var(--text-muted);
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.properties-banner {
  margin: 1.5rem 0;
  padding: 0.75rem 1rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.properties-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.property-badge {
  font-size: 0.8125rem;
}

.property-key {
  font-weight: 600;
  color: var(--text-secondary);
}

.property-value {
  color: var(--text-primary);
}

.table-of-contents {
  margin: 1.5rem 0;
  padding: 1rem 1.25rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.toc-title {
  font-weight: 700;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.toc-list {
  list-style: none;
  padding-left: 0;
}

.toc-item {
  margin-bottom: 0.25rem;
}

.toc-level-2 { padding-left: 1rem; }
.toc-level-3 { padding-left: 2rem; }
.toc-level-4 { padding-left: 3rem; }

.toc-link {
  color: var(--accent-color);
  text-decoration: none;
  font-size: 0.9375rem;
}

.toc-link:hover { text-decoration: underline; }

h1, h2, h3, h4, h5, h6 {
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

p { margin-bottom: 1rem; }

a {
  color: var(--accent-color);
  text-decoration: none;
}

a:hover { text-decoration: underline; }

.internal-link {
  font-weight: 500;
  border-bottom: 1px dashed var(--accent-color);
}

.unpublished-link {
  color: var(--text-muted);
  border-bottom: 1px dotted var(--border-color);
}

.tag-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 9999px;
  color: var(--text-secondary);
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875em;
  background-color: var(--code-bg);
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

pre {
  background-color: var(--code-bg);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
}

pre code {
  background-color: transparent;
  padding: 0;
}

blockquote {
  border-left: 4px solid var(--border-color);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--text-secondary);
}

.callout {
  margin: 1.25rem 0;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border-left: 4px solid var(--callout-note-border);
  background-color: var(--callout-note-bg);
}

.callout-title {
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.task-checkbox {
  margin-top: 0.3rem;
}

.task-item.completed .task-text {
  text-decoration: line-through;
  color: var(--text-muted);
}

.table-container {
  overflow-x: auto;
  margin: 1.25rem 0;
}

.markdown-table {
  width: 100%;
  border-collapse: collapse;
}

.markdown-table th, .markdown-table td {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-color);
}

.markdown-table th {
  background-color: var(--bg-secondary);
  font-weight: 600;
}

.transclusion-embed {
  margin: 1.25rem 0;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
}

.transclusion-header {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.divider {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 2rem 0;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.btn {
  padding: 0.4rem 0.8rem;
  font-size: 0.875rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
}

.btn:hover {
  background: var(--bg-tertiary);
}

/* Print Stylesheet */
@media print {
  body {
    background: #fff !important;
    color: #000 !important;
    padding: 0;
  }
  .actions-bar, .theme-toggle {
    display: none !important;
  }
  a {
    color: #000 !important;
    text-decoration: none !important;
  }
  .container {
    max-width: 100% !important;
  }
}

${customCss}
`;
}

/**
 * Generates a complete standalone HTML document for a single note
 */
export function generateSingleNoteHtml(
  note: Note,
  allNotes: Note[] = [note],
  folders: Folder[] = [],
  options: SingleNoteExportOptions = {}
): string {
  const dummyPub = publicationStorage.createDefaultPublication('Single Note Export', {
    type: 'single-note',
    noteId: note.id,
  });

  dummyPub.options.includeTableOfContents = options.includeTableOfContents ?? true;
  dummyPub.options.includeBibliography = options.includeBibliography ?? true;
  dummyPub.options.includeBacklinks = options.includeBacklinks ?? false;
  if (options.propertyAllowlist) {
    dummyPub.options.propertyAllowlist = options.propertyAllowlist;
  }
  if (options.hidePrivateTags !== undefined) {
    dummyPub.options.hidePrivateTags = options.hidePrivateTags;
  }

  const snapshot = resolvePublicationSnapshot(dummyPub, allNotes, folders);

  const rendered = renderNoteToStaticHtml(note, {
    snapshot,
    currentNote: note,
    currentSlug: 'index',
    isSingleHtmlMode: true,
  });

  const theme = options.theme || 'auto';
  const css = getStandaloneHtmlCss(theme, options.customCss);
  const updatedDate = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : '';

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(note.title || 'Untitled Note')}</title>
  <style>
${css}
  </style>
</head>
<body>
  <main class="container">
    <div class="actions-bar">
      <div class="actions-left">
        <button type="button" class="btn" onclick="window.print()">Print Note</button>
      </div>
      <div class="actions-right">
        <button type="button" class="btn" id="theme-btn" onclick="toggleTheme()">Toggle Theme</button>
      </div>
    </div>

    <header class="header">
      <h1 class="note-title">${escapeHtml(note.title || 'Untitled Note')}</h1>
      <div class="note-meta">
        ${updatedDate ? `<span>Last updated: ${escapeHtml(updatedDate)}</span>` : ''}
        ${note.tags && note.tags.length ? `<span>${note.tags.map((t) => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join(' ')}</span>` : ''}
      </div>
    </header>

    ${rendered.propertiesHtml}
    ${rendered.tableOfContentsHtml}

    <article class="content">
      ${rendered.html}
    </article>

    ${rendered.bibliographyHtml}
    ${rendered.backlinksHtml}
  </main>

  <script>
    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'auto';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
    }
  </script>
</body>
</html>`;
}

/**
 * Generates a downloadable Markdown package ZIP containing note.md and metadata
 */
export async function generateMarkdownPackageZip(
  note: Note,
  allNotes: Note[] = [note]
): Promise<Blob> {
  const zip = new JSZip();

  const { content, metadata } = sanitizeMarkdownForPublishing(note.content || '');

  // Frontmatter string
  let mdWithFrontmatter = '';
  if (Object.keys(metadata).length > 0) {
    mdWithFrontmatter = `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n`;
  }
  mdWithFrontmatter += content;

  const safeFilename = `${(note.title || 'note').replace(/[/\\?%*:|"<>]/g, '_')}.md`;
  zip.file(safeFilename, mdWithFrontmatter);

  // Add manifest
  const manifest = {
    title: note.title || 'Untitled Note',
    id: note.id,
    exportedAt: new Date().toISOString(),
    tags: note.tags || [],
    format: 'pkm-markdown-package-v1',
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Triggers a file download in the browser
 */
export function triggerFileDownload(
  blobOrContent: Blob | string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  if (typeof window === 'undefined' || !window.document) return;
  const blob = typeof blobOrContent === 'string'
    ? new Blob([blobOrContent], { type: mimeType })
    : blobOrContent;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
