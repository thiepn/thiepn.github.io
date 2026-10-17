/**
 * Phase P41: Sample Reference Plugins
 * Built-in reference packages demonstrating least-privilege capability patterns.
 */

import { PluginManifest } from '../types';

export interface SamplePluginPackage {
  manifest: PluginManifest;
  workerCode?: string;
  uiHtml?: string;
}

// 1. Advanced Word & Reading Time Counter
export const SAMPLE_WORD_COUNT: SamplePluginPackage = {
  manifest: {
    id: 'org.pkm.word-count',
    name: 'Advanced Word Counter',
    version: '1.0.0',
    apiVersion: '1',
    description: 'Calculates word count, character count, and estimated reading time for highlighted text.',
    author: { name: 'PKM Core Team' },
    category: 'utility',
    entryWorker: 'worker.js',
    permissions: ['notes.read:selected', 'commands.register'],
    contributions: {
      commands: [
        {
          id: 'count-words',
          title: 'Calculate Word Count & Reading Time',
          description: 'Counts words and reading time for selected text or current note',
          icon: 'Calculator',
          requiresSelection: true,
        },
      ],
    },
    supportsMobile: true,
  },
  workerCode: `
    function onActivate(api) {
      api.log.info("Advanced Word Counter initialized.");
    }

    async function onCommand(commandId, context, api) {
      if (commandId === 'count-words') {
        const text = await api.notes.getSelectedText();
        if (!text || text.trim().length === 0) {
          return {
            message: "No text selected. Please highlight text to analyze.",
            words: 0,
            characters: 0,
            readingTimeMinutes: 0
          };
        }

        const trimmed = text.trim();
        const words = trimmed.split(/\\s+/).filter(Boolean).length;
        const characters = trimmed.length;
        const charactersNoSpaces = trimmed.replace(/\\s/g, '').length;
        const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

        api.log.info("Counted " + words + " words across " + characters + " characters.");

        return {
          message: "Count complete: " + words + " words, " + characters + " chars, ~" + readingTimeMinutes + " min read.",
          words: words,
          characters: characters,
          charactersNoSpaces: charactersNoSpaces,
          readingTimeMinutes: readingTimeMinutes
        };
      }
      throw new Error("Unknown command: " + commandId);
    }
  `,
};

// 2. Snippet Manager with Isolated Storage
export const SAMPLE_STORAGE_COMMAND: SamplePluginPackage = {
  manifest: {
    id: 'org.pkm.snippet-manager',
    name: 'Snippet Storage Manager',
    version: '1.0.0',
    apiVersion: '1',
    description: 'Saves and inserts reusable snippet templates using isolated plugin storage.',
    author: { name: 'PKM Core Team' },
    category: 'utility',
    entryWorker: 'worker.js',
    permissions: ['notes.write:selected', 'storage.private', 'commands.register'],
    contributions: {
      commands: [
        {
          id: 'save-snippet',
          title: 'Save Highlighted Text as Snippet',
          description: 'Saves current selection to isolated private storage',
          icon: 'Bookmark',
          requiresSelection: true,
        },
        {
          id: 'insert-snippet',
          title: 'Insert Default Snippet',
          description: 'Replaces selection with saved snippet',
          icon: 'FileText',
        },
      ],
    },
    supportsMobile: true,
  },
  workerCode: `
    function onActivate(api) {
      api.log.info("Snippet Manager activated.");
    }

    async function onCommand(commandId, context, api) {
      if (commandId === 'save-snippet') {
        const text = await api.notes.getSelectedText();
        if (!text) return { message: "No text selected to save as snippet." };
        await api.storage.set('default_snippet', text);
        return { message: "Snippet saved successfully to isolated storage." };
      }
      if (commandId === 'insert-snippet') {
        const snippet = await api.storage.get('default_snippet');
        if (!snippet) return { message: "No snippet currently saved in storage." };
        await api.notes.replaceSelectedText(snippet);
        return { message: "Inserted snippet." };
      }
    }
  `,
};

// 3. Safe Note Mutation with Concurrency Check
export const SAMPLE_NOTE_MUTATION: SamplePluginPackage = {
  manifest: {
    id: 'org.pkm.timestamp-appender',
    name: 'Safe Note Timestamp Appender',
    version: '1.0.0',
    apiVersion: '1',
    description: 'Demonstrates optimistic concurrency checking by safely appending a meeting sign-off timestamp to the active note.',
    author: { name: 'PKM Core Team' },
    category: 'editor',
    entryWorker: 'worker.js',
    permissions: ['notes.read:current', 'notes.write:current', 'commands.register'],
    contributions: {
      commands: [
        {
          id: 'append-signoff',
          title: 'Append Meeting Sign-off Timestamp',
          description: 'Safely mutates the current note with optimistic concurrency check',
          icon: 'Clock',
        },
      ],
    },
    supportsMobile: true,
  },
  workerCode: `
    async function onCommand(commandId, context, api) {
      if (commandId === 'append-signoff') {
        const current = await api.notes.getCurrentNote();
        if (!current) return { message: "No active note is open in the editor." };

        const now = new Date().toLocaleString();
        const stamp = "\\n\\n---\\n*Reviewed & Signed off on " + now + "*";

        const res = await api.notes.mutateCurrentNote({
          expectedVersion: current.version,
          operations: {
            appendContent: stamp
          }
        });

        api.log.info("Appended timestamp to note " + res.noteId);
        return { message: "Successfully appended timestamp to note!" };
      }
    }
  `,
};

// 4. Markdown Table Beautifier
export const SAMPLE_TABLE_FORMATTER: SamplePluginPackage = {
  manifest: {
    id: 'org.pkm.table-formatter',
    name: 'Markdown Table Formatter',
    version: '1.1.0',
    apiVersion: '1',
    description: 'Neatly aligns and formats Markdown ASCII tables with consistent padding and separator lines.',
    author: { name: 'PKM Core Team' },
    category: 'editor',
    entryWorker: 'worker.js',
    permissions: ['notes.read:selected', 'notes.write:selected', 'commands.register'],
    contributions: {
      commands: [
        {
          id: 'format-table',
          title: 'Format Selected Markdown Table',
          description: 'Aligns table columns and delimiters in highlighted text',
          icon: 'Table',
          requiresSelection: true,
        },
      ],
    },
    supportsMobile: true,
  },
  workerCode: `
    function formatTable(text) {
      const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return text;

      const rows = lines.map(line => {
        let content = line;
        if (content.startsWith('|')) content = content.slice(1);
        if (content.endsWith('|')) content = content.slice(0, -1);
        return content.split('|').map(cell => cell.trim());
      });

      const colCount = Math.max(...rows.map(r => r.length));
      const colWidths = new Array(colCount).fill(3);

      rows.forEach((row, rowIdx) => {
        if (rowIdx === 1) return; // separator
        row.forEach((cell, colIdx) => {
          colWidths[colIdx] = Math.max(colWidths[colIdx] || 3, cell.length);
        });
      });

      const formattedRows = rows.map((row, rowIdx) => {
        if (rowIdx === 1) {
          // Separator row
          const seps = colWidths.map(w => '-'.repeat(w + 2));
          return '|' + seps.join('|') + '|';
        }
        const paddedCells = colWidths.map((w, colIdx) => {
          const cell = row[colIdx] || '';
          return ' ' + cell.padEnd(w, ' ') + ' ';
        });
        return '|' + paddedCells.join('|') + '|';
      });

      return formattedRows.join('\\n');
    }

    async function onCommand(commandId, context, api) {
      if (commandId === 'format-table') {
        const text = await api.notes.getSelectedText();
        if (!text || !text.includes('|')) {
          return { message: "Please highlight a Markdown table containing '|' pipe characters." };
        }
        const formatted = formatTable(text);
        await api.notes.replaceSelectedText(formatted);
        api.log.info("Formatted table successfully.");
        return { message: "Markdown table formatted successfully!" };
      }
    }
  `,
};

// 5. Vault Statistics Workspace View
export const SAMPLE_VAULT_STATS: SamplePluginPackage = {
  manifest: {
    id: 'org.pkm.vault-stats',
    name: 'Vault Health & Stats Panel',
    version: '1.0.0',
    apiVersion: '1',
    description: 'An isolated workspace panel displaying metadata statistics, tag distributions, and vault activity.',
    author: { name: 'PKM Core Team' },
    category: 'workspace',
    entryUi: 'ui/index.html',
    permissions: ['notes.read:metadata', 'workspace.view'],
    contributions: {
      views: [
        {
          id: 'vault-stats-panel',
          title: 'Vault Statistics',
          icon: 'BarChart2',
          supportsMobile: true,
        },
      ],
    },
    supportsMobile: true,
  },
  uiHtml: `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
        <h2 style="font-size: 16px; font-weight: 600;">Vault Health & Overview</h2>
        <button id="refreshBtn" style="padding: 6px 12px; background: var(--accent); color: #fff; border: none; border-radius: 6px; cursor: pointer;">Refresh</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
          <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase;">Total Notes</div>
          <div id="statTotalNotes" style="font-size: 22px; font-weight: 700; margin-top: 4px;">--</div>
        </div>
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
          <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase;">Unique Tags</div>
          <div id="statUniqueTags" style="font-size: 22px; font-weight: 700; margin-top: 4px;">--</div>
        </div>
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
          <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase;">Folders</div>
          <div id="statFolders" style="font-size: 22px; font-weight: 700; margin-top: 4px;">--</div>
        </div>
      </div>

      <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
        <h3 style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Top Tags</h3>
        <div id="tagList" style="display: flex; flex-wrap: wrap; gap: 6px;">
          <span style="color: var(--text-muted); font-size: 12px;">Loading metadata...</span>
        </div>
      </div>
    </div>

    <script>
      async function loadStats() {
        try {
          const notes = await window.pkm.notes.getMetadataIndex();
          if (!notes) return;

          document.getElementById('statTotalNotes').textContent = notes.length;

          const tagCounts = {};
          const folderSet = new Set();

          notes.forEach(n => {
            if (n.folderId) folderSet.add(n.folderId);
            if (Array.isArray(n.tags)) {
              n.tags.forEach(t => {
                tagCounts[t] = (tagCounts[t] || 0) + 1;
              });
            }
          });

          const uniqueTags = Object.keys(tagCounts);
          document.getElementById('statUniqueTags').textContent = uniqueTags.length;
          document.getElementById('statFolders').textContent = folderSet.size;

          const sortedTags = uniqueTags.sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 10);
          const tagListEl = document.getElementById('tagList');
          tagListEl.innerHTML = '';

          if (sortedTags.length === 0) {
            tagListEl.innerHTML = '<span style="color: var(--text-muted); font-size: 12px;">No tags found in vault.</span>';
          } else {
            sortedTags.forEach(tag => {
              const badge = document.createElement('span');
              badge.style.cssText = 'background: var(--bg-muted); border-radius: 4px; padding: 3px 8px; font-size: 11px;';
              badge.textContent = '#' + tag + ' (' + tagCounts[tag] + ')';
              tagListEl.appendChild(badge);
            });
          }
          window.pkm.log('Loaded vault stats for ' + notes.length + ' notes.');
        } catch (err) {
          window.pkm.log('Failed to load stats: ' + err.message, 'error');
        }
      }

      document.getElementById('refreshBtn').addEventListener('click', loadStats);
      loadStats();
    </script>
  `,
};

// 6. Sample CSV Importer
export const SAMPLE_CSV_IMPORTER: SamplePluginPackage = {
  manifest: {
    id: 'org.pkm.csv-importer',
    name: 'Tabular CSV Converter',
    version: '1.0.0',
    apiVersion: '1',
    description: 'Translates CSV data exports into formatted Markdown notes.',
    author: { name: 'PKM Core Team' },
    category: 'import-export',
    entryWorker: 'worker.js',
    permissions: ['notes.read:metadata', 'import.register'],
    contributions: {
      adapters: [
        {
          id: 'csv-to-markdown',
          name: 'CSV Note Converter',
          supportedExtensions: ['.csv', '.tsv'],
          type: 'import',
        },
      ],
    },
    supportsMobile: true,
  },
  workerCode: `
    function onActivate(api) {
      api.log.info("CSV Importer adapter registered.");
    }
  `,
};

// 7. Mock Feed & Readwise Connector
export const SAMPLE_MOCK_CONNECTOR: SamplePluginPackage = {
  manifest: {
    id: 'org.pkm.feed-connector',
    name: 'RSS & Web Articles Ingestor',
    version: '1.0.0',
    apiVersion: '1',
    description: 'Demonstrates staged external feed synchronization into staged universal inbox items.',
    author: { name: 'PKM Core Team' },
    category: 'utility',
    entryWorker: 'worker.js',
    permissions: ['network.request', 'commands.register'],
    contributions: {
      commands: [
        {
          id: 'fetch-feed-articles',
          title: 'Fetch Staged RSS Articles',
          description: 'Queries external news feed without direct database writes',
          icon: 'Rss',
        },
      ],
    },
    supportsMobile: true,
  },
  workerCode: `
    async function onCommand(commandId, context, api) {
      if (commandId === 'fetch-feed-articles') {
        api.log.info("Fetching staged feed items...");
        return {
          message: "Feed sync complete: 3 staged articles ready for review in Universal Inbox.",
          items: [
            { title: "Building Resilient Offline Systems", source: "RSS Feed", date: new Date().toISOString() },
            { title: "Deterministic Extension Sandboxes", source: "RSS Feed", date: new Date().toISOString() }
          ]
        };
      }
    }
  `,
};

export const ALL_SAMPLE_PLUGINS: SamplePluginPackage[] = [
  SAMPLE_WORD_COUNT,
  SAMPLE_STORAGE_COMMAND,
  SAMPLE_NOTE_MUTATION,
  SAMPLE_TABLE_FORMATTER,
  SAMPLE_VAULT_STATS,
  SAMPLE_CSV_IMPORTER,
  SAMPLE_MOCK_CONNECTOR,
];
