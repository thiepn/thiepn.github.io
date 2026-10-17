/**
 * PKM V1.8: Built-in Export Profiles
 * Ready-to-use profiles configured for standard export scenarios.
 */

import { ExportProfile } from './exportTypes';

export const BUILTIN_EXPORT_PROFILES: ExportProfile[] = [
  {
    id: 'clean-portable-markdown',
    name: 'Clean Portable Markdown',
    description: '100% CommonMark-compliant Markdown files with rewritten relative links and stripped private tags.',
    format: 'portable-markdown',
    defaultScope: 'selected-notes',
    isBuiltin: true,
    config: {
      linkRewriteMode: 'relative-markdown',
      includeAttachments: true,
      hidePrivateTags: true,
      maskSensitiveData: true,
      excludeTags: ['private', 'secret', 'draft', 'confidential'],
      includeTableOfContents: true,
      includeBacklinks: false,
    },
  },
  {
    id: 'native-vault-archive',
    name: 'Native PKM Vault Archive',
    description: 'Preserves raw [[wikilinks]], block IDs, transclusions, and complete YAML frontmatter for vault-to-vault migration.',
    format: 'native-markdown',
    defaultScope: 'full-vault',
    isBuiltin: true,
    config: {
      linkRewriteMode: 'preserve-wikilinks',
      includeAttachments: true,
      hidePrivateTags: false,
      maskSensitiveData: false,
      excludeTags: [],
      includeTableOfContents: true,
      includeBacklinks: true,
    },
  },
  {
    id: 'standalone-html-doc',
    name: 'Standalone Web Document',
    description: 'Single self-contained HTML file with embedded styling, KaTeX formulas, code syntax, and print / PDF styles.',
    format: 'standalone-html',
    defaultScope: 'current-note',
    isBuiltin: true,
    config: {
      theme: 'light',
      includeTableOfContents: true,
      includeBibliography: true,
      maskSensitiveData: true,
      hidePrivateTags: true,
      excludeTags: ['private'],
    },
  },
  {
    id: 'static-site-bundle',
    name: 'Searchable Static Site',
    description: 'Multi-page static HTML documentation site with 100% client-side offline search, ready for GitHub Pages or static hosting.',
    format: 'static-site',
    defaultScope: 'selected-notes',
    isBuiltin: true,
    config: {
      basePath: './',
      siteTitle: 'Personal OS Knowledge Base',
      includeTableOfContents: true,
      includeBacklinks: true,
      includeBibliography: true,
      includeAttachments: true,
      hidePrivateTags: true,
      excludeTags: ['private', 'confidential'],
      maskSensitiveData: true,
    },
  },
  {
    id: 'academic-bibtex',
    name: 'Research & BibTeX Package',
    description: 'Standard BibTeX (.bib) and CSL-JSON bibliography metadata with citation keys and DOIs.',
    format: 'bibtex',
    defaultScope: 'domain-records',
    isBuiltin: true,
    config: {
      domain: 'references',
      maskSensitiveData: true,
    },
  },
  {
    id: 'calendar-contacts-sync',
    name: 'Calendar & Contact Interchange',
    description: 'Standard iCalendar (.ics) events and vCard 4.0 (.vcf) contact profiles for calendar and phone sync.',
    format: 'ics',
    defaultScope: 'domain-records',
    isBuiltin: true,
    config: {
      domain: 'calendar',
      maskSensitiveData: true,
    },
  },
  {
    id: 'full-portable-vault',
    name: 'Full Portable Vault (Restorable)',
    description: 'Complete deterministic snapshot of all notes, folders, canvases, and attachments with verified checksums.',
    format: 'full-portable-vault',
    defaultScope: 'full-vault',
    isBuiltin: true,
    config: {
      includeAttachments: true,
      maskSensitiveData: false,
      hidePrivateTags: false,
      linkRewriteMode: 'preserve-wikilinks',
    },
  },
];
