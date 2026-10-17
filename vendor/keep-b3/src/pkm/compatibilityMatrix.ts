import { ProviderCapability } from './remoteGitTypes';

export interface BrowserCompatibilityEntry {
  browser: 'Chrome / Chromium / Edge' | 'Firefox' | 'Safari' | 'Mobile WebKit / Blink';
  githubRestApi: 'Fully Supported' | 'Supported' | 'Degraded';
  gitlabApi: 'Fully Supported' | 'Supported' | 'Degraded';
  giteaApi: 'Fully Supported' | 'Supported' | 'Degraded';
  directSmartHttp: 'Requires User CORS Proxy' | 'Requires User CORS Proxy';
  notes: string;
}

export const PROVIDER_CAPABILITIES: Record<string, ProviderCapability> = {
  github: {
    provider: 'github',
    name: 'GitHub (REST Git Database API)',
    directBrowserCORS: true,
    authTypes: ['pat', 'bearer'],
    supportsDirectCommits: true,
    requiresCorsProxy: false,
    recommendedWorkflow: 'Fine-Grained or Classic Personal Access Token (repo scope)',
    testedStatus: 'tested',
    notes: 'Direct CORS allowed by api.github.com. Creates authentic git trees, blobs, and commits without third-party proxies.',
  },
  gitlab: {
    provider: 'gitlab',
    name: 'GitLab (API v4 Commits)',
    directBrowserCORS: true,
    authTypes: ['pat', 'oauth_token', 'bearer'],
    supportsDirectCommits: true,
    requiresCorsProxy: false,
    recommendedWorkflow: 'Personal Access Token (api or read_repository + write_repository scopes)',
    testedStatus: 'tested',
    notes: 'Direct CORS allowed by gitlab.com and self-hosted instances. Supports multi-file atomic commit API.',
  },
  gitea: {
    provider: 'gitea',
    name: 'Gitea / Forgejo (API v1)',
    directBrowserCORS: true,
    authTypes: ['pat', 'bearer'],
    supportsDirectCommits: true,
    requiresCorsProxy: false,
    recommendedWorkflow: 'Personal Access Token (repo scope) on your self-hosted Gitea / Forgejo instance',
    testedStatus: 'tested',
    notes: 'Direct CORS supported when configured on Gitea instances. Uses Gitea contents/git API.',
  },
  custom_http: {
    provider: 'custom_http',
    name: 'Smart Git HTTP (isomorphic-git)',
    directBrowserCORS: false,
    authTypes: ['pat', 'bearer'],
    supportsDirectCommits: true,
    requiresCorsProxy: true,
    recommendedWorkflow: 'Requires explicitly providing your own trusted CORS proxy URL',
    testedStatus: 'unsupported_without_proxy',
    notes: 'Standard git.example.com does not send CORS headers for browser Git Smart HTTP. A user-owned proxy is required.',
  },
};

export const BROWSER_COMPATIBILITY_MATRIX: BrowserCompatibilityEntry[] = [
  {
    browser: 'Chrome / Chromium / Edge',
    githubRestApi: 'Fully Supported',
    gitlabApi: 'Fully Supported',
    giteaApi: 'Fully Supported',
    directSmartHttp: 'Requires User CORS Proxy',
    notes: 'Native Fetch with CORS headers, full binary blobs & streaming supported.',
  },
  {
    browser: 'Firefox',
    githubRestApi: 'Fully Supported',
    gitlabApi: 'Fully Supported',
    giteaApi: 'Fully Supported',
    directSmartHttp: 'Requires User CORS Proxy',
    notes: 'Standard Web Fetch & IndexedDB LightningFS supported.',
  },
  {
    browser: 'Safari',
    githubRestApi: 'Fully Supported',
    gitlabApi: 'Fully Supported',
    giteaApi: 'Fully Supported',
    directSmartHttp: 'Requires User CORS Proxy',
    notes: 'Standard Web Fetch & IndexedDB supported across iOS and macOS.',
  },
  {
    browser: 'Mobile WebKit / Blink',
    githubRestApi: 'Fully Supported',
    gitlabApi: 'Fully Supported',
    giteaApi: 'Fully Supported',
    directSmartHttp: 'Requires User CORS Proxy',
    notes: 'Responsive UI, session-only token security prevents device credential leakage.',
  },
];

export interface MigrationFormatCapability {
  formatId: string;
  name: string;
  fidelity: 'Full' | 'High' | 'Standard';
  supportedEntities: string[];
  notes: string;
}

export const MIGRATION_CAPABILITIES_MATRIX: MigrationFormatCapability[] = [
  {
    formatId: 'obsidian',
    name: 'Obsidian Vault',
    fidelity: 'Full',
    supportedEntities: ['Wikilinks', 'Embeds', 'Aliases', 'Block IDs', 'Callouts', 'Canvas Whiteboards', 'Daily Notes', 'Attachments'],
    notes: 'Complete link graph reconstruction, inert Dataview preservation, attachment folder mapping.',
  },
  {
    formatId: 'notion',
    name: 'Notion Export (Markdown & CSV)',
    fidelity: 'High',
    supportedEntities: ['Clean Page Titles', 'Subpage Trees', 'Database CSVs', 'Frontmatter Properties', 'Callouts', 'Internal Links'],
    notes: 'Strips 32-char hex export hashes, maps CSV tables to notes with frontmatter properties.',
  },
  {
    formatId: 'evernote-enex',
    name: 'Evernote (.enex Archive)',
    fidelity: 'High',
    supportedEntities: ['ENML Rich Text', 'Checkboxes', 'Tags', 'Notebooks', 'Base64 Attachments', 'Encrypted Block Markers'],
    notes: 'Safe XXE XML parser, converts ENML to canonical Markdown and extracts binary media.',
  },
  {
    formatId: 'generic-markdown',
    name: 'Generic Markdown Directory',
    fidelity: 'High',
    supportedEntities: ['Markdown Notes', 'YAML Frontmatter', 'Folder Hierarchy', 'Inline Tags', 'Media Attachments'],
    notes: 'Universal folder and file importer with UTF-8 BOM handling and path traversal protection.',
  },
  {
    formatId: 'joplin',
    name: 'Joplin Markdown',
    fidelity: 'High',
    supportedEntities: ['Resource Links (:/id)', 'Metadata Footers', 'Tags', 'Notebook Trees'],
    notes: 'Translates Joplin internal resource links to local attachment embeds.',
  },
  {
    formatId: 'bibtex-reference',
    name: 'BibTeX & Academic References',
    fidelity: 'Full',
    supportedEntities: ['Citation Keys', 'DOIs', 'Abstracts', 'Author Lists', 'Matched PDF Attachments'],
    notes: 'Direct integration with Reference Manager and PDF citation indexer.',
  },
];

