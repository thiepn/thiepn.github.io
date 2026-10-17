/**
 * PKM Phase P39: Static Site Builder & Publishing Pipeline
 * Compiles a complete, deterministic, portable static site virtual file tree and ZIP package.
 */

import JSZip from 'jszip';
import { Note, Folder } from '../../types';
import { VaultIndex } from '../types';
import { vaultManager } from '../indexer';
import { computeDeterministicChecksum } from '../portableVaultSerializer';
import {
  Publication,
  PublicationBuildResult,
  PublicationBuildSummary,
  VirtualFile,
} from './publishingTypes';
import { resolvePublicationSnapshot } from './publicationSourceResolver';
import { auditPublication } from './publicationValidator';
import { renderNoteToStaticHtml, escapeHtml } from './staticRenderer';
import { buildStaticSearchIndex, generateStaticSearchJs } from './staticSearch';
import { getStandaloneHtmlCss } from './singleNoteExporter';
import { publicationStorage } from './publicationStorage';

/**
 * Generates the master site CSS for static site builds
 */
export function generateStaticSiteCss(theme = 'auto', customCss = ''): string {
  const baseCss = getStandaloneHtmlCss(theme as any, customCss);
  const layoutCss = `
/* Site Layout & Navigation */
.site-wrapper {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.site-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: 40;
}

.site-brand {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-primary);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.search-trigger-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
}

.search-trigger-btn kbd {
  font-size: 0.75rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background-color: var(--bg-tertiary);
}

.site-body {
  display: flex;
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.site-sidebar {
  width: 260px;
  padding: 1.5rem 1rem;
  border-right: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  overflow-y: auto;
  max-height: calc(100vh - 60px);
  position: sticky;
  top: 60px;
}

.sidebar-heading {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  padding-left: 0.5rem;
}

.sidebar-nav {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-nav li {
  margin-bottom: 0.2rem;
}

.sidebar-link {
  display: block;
  padding: 0.35rem 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-link:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.sidebar-link.active {
  background-color: var(--bg-secondary);
  color: var(--accent-color);
  font-weight: 600;
}

.site-content {
  flex: 1;
  padding: 2rem 2.5rem;
  min-width: 0;
}

.site-footer {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-primary);
}

/* Search Modal */
.search-modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 100;
}

.search-modal.hidden {
  display: none;
}

.search-modal-container {
  width: 100%;
  max-width: 600px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  margin: 0 1rem;
}

.search-input-wrapper {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  outline: none;
}

.search-input:focus {
  border-color: var(--accent-color);
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
}

.search-empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.search-result-item {
  display: block;
  padding: 0.75rem;
  border-radius: 6px;
  text-decoration: none;
  margin-bottom: 0.25rem;
}

.search-result-item:hover {
  background-color: var(--bg-secondary);
}

.search-result-title {
  font-weight: 600;
  color: var(--accent-color);
  font-size: 0.9375rem;
}

.search-result-tags {
  margin: 0.2rem 0;
}

.search-result-excerpt {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

@media (max-width: 840px) {
  .site-sidebar {
    display: none;
  }
  .site-content {
    padding: 1.5rem 1rem;
  }
}
`;
  return `${baseCss}\n${layoutCss}`;
}

/**
 * Builds the full static site package
 */
export async function buildPublicationSite(
  publication: Publication,
  allNotes: Note[],
  folders: Folder[] = [],
  vaultIndex: VaultIndex = vaultManager.getIndex()
): Promise<PublicationBuildResult> {
  const validationReport = auditPublication(publication, allNotes, folders, vaultIndex);

  if (!validationReport.canBuild) {
    return {
      success: false,
      summary: {
        buildId: `build_fail_${Date.now()}`,
        timestamp: new Date().toISOString(),
        pageCount: 0,
        assetCount: 0,
        totalBytes: 0,
        checksum: 'none',
        warningsCount: validationReport.warningCount,
        errorsCount: validationReport.errorCount,
        pages: [],
      },
      files: [],
      validationReport,
    };
  }

  const snapshot = resolvePublicationSnapshot(publication, allNotes, folders, vaultIndex);
  const virtualFiles: VirtualFile[] = [];
  const buildId = `build_${Date.now()}`;
  const now = new Date().toISOString();
  const siteTitle = publication.output.siteTitle || publication.name || 'Digital Garden';
  const theme = publication.output.theme || 'auto';
  const basePath = publication.output.basePath || '/';

  // 1. Assets: CSS
  const cssContent = generateStaticSiteCss(theme, publication.output.customCss);
  virtualFiles.push({
    path: 'assets/style.css',
    content: cssContent,
    mimeType: 'text/css',
    isBinary: false,
  });

  // 2. Assets: Offline Search Script
  const searchJs = generateStaticSearchJs();
  virtualFiles.push({
    path: 'assets/search.js',
    content: searchJs,
    mimeType: 'application/javascript',
    isBinary: false,
  });

  // 3. Search Index: search/index.json
  const searchIndexDocs = buildStaticSearchIndex(snapshot);
  virtualFiles.push({
    path: 'search/index.json',
    content: JSON.stringify(searchIndexDocs, null, 2),
    mimeType: 'application/json',
    isBinary: false,
  });

  // 4. Robots.txt
  const robotsTxt = publication.output.noindex
    ? `User-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\nSitemap: ${basePath}sitemap.xml\n`;
  virtualFiles.push({
    path: 'robots.txt',
    content: robotsTxt,
    mimeType: 'text/plain',
    isBinary: false,
  });

  // 5. Build Sidebar Links HTML
  const sortedNotes = [...snapshot.primaryNotes].sort((a, b) =>
    (a.title || '').localeCompare(b.title || '')
  );

  const getSidebarHtml = (activeSlug?: string, isSubPage = false) => {
    let html = `<ul class="sidebar-nav">`;
    html += `<li><a href="${isSubPage ? '../index.html' : './index.html'}" class="sidebar-link ${!activeSlug || activeSlug === 'index' ? 'active' : ''}">🏠 Home</a></li>`;
    for (const note of sortedNotes) {
      const slug = snapshot.slugMap.get(note.id)!;
      const targetHref = isSubPage ? `${slug}.html` : `notes/${slug}.html`;
      const isActive = activeSlug === slug;
      html += `<li><a href="${targetHref}" class="sidebar-link ${isActive ? 'active' : ''}" title="${escapeHtml(note.title || 'Untitled')}">${escapeHtml(note.title || 'Untitled')}</a></li>`;
    }
    html += `</ul>`;
    return html;
  };

  const getSearchModalHtml = () => `
    <div id="search-modal" class="search-modal hidden" aria-hidden="true">
      <div class="search-modal-container">
        <div class="search-input-wrapper">
          <input type="text" id="search-input" class="search-input" placeholder="Search notes, headings, and tags..." autocomplete="off" />
        </div>
        <div id="search-results" class="search-results">
          <div class="search-empty">Type to search...</div>
        </div>
      </div>
    </div>
  `;

  const getHtmlTemplate = (
    pageTitle: string,
    contentHtml: string,
    propertiesHtml: string,
    tocHtml: string,
    backlinksHtml: string,
    bibHtml: string,
    currentSlug?: string,
    isSubPage = false
  ) => {
    const rootRel = isSubPage ? '../' : './';
    return `<!DOCTYPE html>
<html lang="${escapeHtml(publication.output.language || 'en')}" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)} - ${escapeHtml(siteTitle)}</title>
  ${publication.output.siteDescription ? `<meta name="description" content="${escapeHtml(publication.output.siteDescription)}">` : ''}
  ${publication.output.author ? `<meta name="author" content="${escapeHtml(publication.output.author)}">` : ''}
  ${publication.output.noindex ? `<meta name="robots" content="noindex, nofollow">` : ''}
  <link rel="stylesheet" href="${rootRel}assets/style.css">
</head>
<body data-basepath="${escapeHtml(basePath)}">
  <div class="site-wrapper">
    <nav class="site-navbar">
      <a href="${rootRel}index.html" class="site-brand">${escapeHtml(siteTitle)}</a>
      <div class="nav-actions">
        ${publication.options.includeStaticSearch ? `
        <button type="button" id="search-open-btn" class="search-trigger-btn">
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>` : ''}
        <button type="button" class="btn" onclick="toggleSiteTheme()">Theme</button>
      </div>
    </nav>

    <div class="site-body">
      <aside class="site-sidebar">
        <div class="sidebar-heading">Navigation</div>
        ${getSidebarHtml(currentSlug, isSubPage)}
      </aside>

      <main class="site-content">
        <header class="header">
          <h1 class="note-title">${escapeHtml(pageTitle)}</h1>
        </header>

        ${propertiesHtml}
        ${tocHtml}

        <article class="content">
          ${contentHtml}
        </article>

        ${bibHtml}
        ${backlinksHtml}
      </main>
    </div>

    <footer class="site-footer">
      <p>Published with PKM Static Site Generator • ${new Date().getFullYear()}</p>
    </footer>
  </div>

  ${publication.options.includeStaticSearch ? getSearchModalHtml() : ''}
  ${publication.options.includeStaticSearch ? `<script src="${rootRel}assets/search.js"></script>` : ''}
  <script>
    function toggleSiteTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'auto';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
    }
  </script>
</body>
</html>`;
  };

  const pagesSummary: Array<{
    noteId: string;
    title: string;
    slug: string;
    path: string;
    byteSize: number;
  }> = [];

  // 6. Generate Index Page (index.html)
  let homeNote = snapshot.homeNote;
  if (!homeNote && snapshot.primaryNotes.length > 0) {
    homeNote = snapshot.primaryNotes[0];
  }

  if (homeNote) {
    const renderedHome = renderNoteToStaticHtml(homeNote, {
      snapshot,
      currentNote: homeNote,
      currentSlug: 'index',
    });
    const homeHtml = getHtmlTemplate(
      homeNote.title || 'Home',
      renderedHome.html,
      renderedHome.propertiesHtml,
      renderedHome.tableOfContentsHtml,
      renderedHome.backlinksHtml,
      renderedHome.bibliographyHtml,
      'index',
      false
    );

    virtualFiles.push({
      path: 'index.html',
      content: homeHtml,
      mimeType: 'text/html',
      isBinary: false,
    });

    pagesSummary.push({
      noteId: homeNote.id,
      title: homeNote.title || 'Home',
      slug: 'index',
      path: 'index.html',
      byteSize: new Blob([homeHtml]).size,
    });
  }

  // 7. Generate Individual Note Pages (notes/<slug>.html)
  for (const note of snapshot.primaryNotes) {
    const slug = snapshot.slugMap.get(note.id)!;
    const rendered = renderNoteToStaticHtml(note, {
      snapshot,
      currentNote: note,
      currentSlug: slug,
    });

    const notePageHtml = getHtmlTemplate(
      note.title || 'Untitled Note',
      rendered.html,
      rendered.propertiesHtml,
      rendered.tableOfContentsHtml,
      rendered.backlinksHtml,
      rendered.bibliographyHtml,
      slug,
      true
    );

    const relativePath = `notes/${slug}.html`;
    virtualFiles.push({
      path: relativePath,
      content: notePageHtml,
      mimeType: 'text/html',
      isBinary: false,
    });

    pagesSummary.push({
      noteId: note.id,
      title: note.title || 'Untitled Note',
      slug,
      path: relativePath,
      byteSize: new Blob([notePageHtml]).size,
    });
  }

  // 8. Sitemap: sitemap.xml
  if (publication.options.enableSitemap) {
    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    sitemapXml += `  <url><loc>${escapeHtml(basePath)}index.html</loc><lastmod>${now.substring(0, 10)}</lastmod></url>\n`;
    for (const note of snapshot.primaryNotes) {
      const slug = snapshot.slugMap.get(note.id)!;
      const mod = note.updatedAt ? note.updatedAt.substring(0, 10) : now.substring(0, 10);
      sitemapXml += `  <url><loc>${escapeHtml(basePath)}notes/${escapeHtml(slug)}.html</loc><lastmod>${mod}</lastmod></url>\n`;
    }
    sitemapXml += `</urlset>\n`;

    virtualFiles.push({
      path: 'sitemap.xml',
      content: sitemapXml,
      mimeType: 'application/xml',
      isBinary: false,
    });
  }

  // 9. RSS Feed: feed.xml
  if (publication.options.enableRss) {
    let rssXml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n`;
    rssXml += `  <title>${escapeHtml(siteTitle)}</title>\n`;
    rssXml += `  <link>${escapeHtml(basePath)}</link>\n`;
    rssXml += `  <description>${escapeHtml(publication.output.siteDescription || siteTitle)}</description>\n`;
    rssXml += `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;

    for (const note of snapshot.primaryNotes) {
      const slug = snapshot.slugMap.get(note.id)!;
      rssXml += `  <item>\n`;
      rssXml += `    <title>${escapeHtml(note.title || 'Untitled')}</title>\n`;
      rssXml += `    <link>${escapeHtml(basePath)}notes/${escapeHtml(slug)}.html</link>\n`;
      rssXml += `    <pubDate>${note.createdAt ? new Date(note.createdAt).toUTCString() : new Date().toUTCString()}</pubDate>\n`;
      rssXml += `  </item>\n`;
    }
    rssXml += `</channel>\n</rss>\n`;

    virtualFiles.push({
      path: 'feed.xml',
      content: rssXml,
      mimeType: 'application/rss+xml',
      isBinary: false,
    });
  }

  // 10. Generate JSZip archive
  const zip = new JSZip();
  let totalBytes = 0;
  for (const vf of virtualFiles) {
    zip.file(vf.path, vf.content);
    if (typeof vf.content === 'string') {
      totalBytes += vf.content.length;
    } else {
      totalBytes += vf.content.byteLength;
    }
  }

  const checksum = computeDeterministicChecksum(JSON.stringify(virtualFiles.map((f) => ({ path: f.path, size: typeof f.content === 'string' ? f.content.length : f.content.byteLength }))));

  const manifest = {
    buildId,
    siteTitle,
    generatedAt: now,
    checksum,
    pageCount: pagesSummary.length,
    pages: pagesSummary,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const zipBlob = await zip.generateAsync({ type: 'blob' });

  const summary: PublicationBuildSummary = {
    buildId,
    timestamp: now,
    pageCount: pagesSummary.length,
    assetCount: virtualFiles.length - pagesSummary.length,
    totalBytes: zipBlob.size,
    checksum,
    warningsCount: validationReport.warningCount,
    errorsCount: validationReport.errorCount,
    pages: pagesSummary,
  };

  // Persist updated publication build summary
  publicationStorage.savePublication({
    ...publication,
    lastBuiltAt: now,
    lastBuildSummary: summary,
  });

  // In-memory preview HTML from index.html
  const indexFile = virtualFiles.find((f) => f.path === 'index.html');
  const previewHtml = typeof indexFile?.content === 'string' ? indexFile.content : undefined;

  return {
    success: true,
    summary,
    files: virtualFiles,
    validationReport,
    zipBlob,
    previewHtml,
  };
}
