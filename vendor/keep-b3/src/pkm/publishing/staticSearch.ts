/**
 * PKM Phase P39: Static Search Index & Client-Side Search Engine
 * Builds pre-computed search index JSON and generates lightweight offline vanilla JS search runtime.
 */

import { Note } from '../../types';
import { ResolvedPublicationSnapshot } from './publishingTypes';
import { sanitizeMarkdownForPublishing } from './staticRenderer';

export interface StaticSearchDocument {
  id: string;
  title: string;
  slug: string;
  url: string;
  tags: string[];
  headings: string[];
  excerpt: string;
}

/**
 * Builds a search index JSON payload for all primary published notes
 */
export function buildStaticSearchIndex(
  snapshot: ResolvedPublicationSnapshot
): StaticSearchDocument[] {
  const docs: StaticSearchDocument[] = [];

  for (const note of snapshot.primaryNotes) {
    const slug = snapshot.slugMap.get(note.id);
    if (!slug) continue;

    const { content } = sanitizeMarkdownForPublishing(note.content || '', {
      hidePrivateTags: snapshot.publication.options.hidePrivateTags,
      excludeTags: snapshot.publication.source.excludeTags,
    });

    // Extract headings
    const headingMatches = content.match(/^#{1,6}\s+(.+)$/gm) || [];
    const headings = headingMatches.map((h) => h.replace(/^#{1,6}\s+/, '').trim());

    // Extract clean plain text excerpt
    const plain = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*`_~[\](){}<>!|\\/@:;=+^%&$?"',.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const excerpt = plain.substring(0, 200);

    docs.push({
      id: note.id,
      title: note.title || 'Untitled',
      slug,
      url: `notes/${slug}.html`,
      tags: note.tags || [],
      headings,
      excerpt,
    });
  }

  return docs;
}

/**
 * Generates standalone vanilla JavaScript for client-side search in the exported static site
 */
export function generateStaticSearchJs(): string {
  return `/**
 * PKM Static Site Search Runtime
 * 100% Offline, Client-Side Search Engine
 */
(function() {
  let searchIndex = [];
  let isIndexLoaded = false;

  async function loadIndex() {
    if (isIndexLoaded) return searchIndex;
    try {
      const rootPath = document.body.getAttribute('data-basepath') || './';
      const isSub = window.location.pathname.includes('/notes/');
      const indexPath = isSub ? '../search/index.json' : './search/index.json';
      const res = await fetch(indexPath);
      if (res.ok) {
        searchIndex = await res.json();
        isIndexLoaded = true;
      }
    } catch (e) {
      console.warn('Could not load search index:', e);
    }
    return searchIndex;
  }

  function initSearchUI() {
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchOpenBtn = document.getElementById('search-open-btn');
    const searchCloseBtn = document.getElementById('search-close-btn');

    if (!searchModal || !searchInput || !searchResults) return;

    function openModal() {
      searchModal.classList.remove('hidden');
      searchModal.setAttribute('aria-hidden', 'false');
      searchInput.value = '';
      searchResults.innerHTML = '<div class="search-empty">Type to search notes, headings, and tags...</div>';
      searchInput.focus();
      loadIndex();
    }

    function closeModal() {
      searchModal.classList.add('hidden');
      searchModal.setAttribute('aria-hidden', 'true');
    }

    if (searchOpenBtn) searchOpenBtn.addEventListener('click', openModal);
    if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeModal);

    searchModal.addEventListener('click', function(e) {
      if (e.target === searchModal) closeModal();
    });

    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openModal();
      } else if (e.key === 'Escape' && !searchModal.classList.contains('hidden')) {
        closeModal();
      }
    });

    searchInput.addEventListener('input', async function(e) {
      const query = (e.target.value || '').trim().toLowerCase();
      if (!query) {
        searchResults.innerHTML = '<div class="search-empty">Type to search notes, headings, and tags...</div>';
        return;
      }

      const docs = await loadIndex();
      const terms = query.split(/\\s+/);

      const matches = docs.filter(function(doc) {
        const titleMatch = terms.every(function(t) { return doc.title.toLowerCase().includes(t); });
        const tagMatch = terms.every(function(t) { return (doc.tags || []).some(function(tag) { return tag.toLowerCase().includes(t); }); });
        const headingMatch = terms.every(function(t) { return (doc.headings || []).some(function(h) { return h.toLowerCase().includes(t); }); });
        const textMatch = terms.every(function(t) { return doc.excerpt.toLowerCase().includes(t); });
        return titleMatch || tagMatch || headingMatch || textMatch;
      });

      if (matches.length === 0) {
        searchResults.innerHTML = '<div class="search-empty">No results found for "' + escapeHtml(query) + '"</div>';
        return;
      }

      const isSub = window.location.pathname.includes('/notes/');
      let html = '';
      matches.slice(0, 20).forEach(function(doc) {
        const targetUrl = isSub ? doc.slug + '.html' : 'notes/' + doc.slug + '.html';
        const tagBadges = (doc.tags || []).map(function(t) {
          return '<span class="tag-badge">#' + escapeHtml(t) + '</span>';
        }).join(' ');

        html += '<a href="' + targetUrl + '" class="search-result-item">' +
          '<div class="search-result-title">' + escapeHtml(doc.title) + '</div>' +
          (doc.tags && doc.tags.length ? '<div class="search-result-tags">' + tagBadges + '</div>' : '') +
          '<div class="search-result-excerpt">' + escapeHtml(doc.excerpt) + '</div>' +
        '</a>';
      });

      searchResults.innerHTML = html;
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchUI);
  } else {
    initSearchUI();
  }
})();
`;
}
