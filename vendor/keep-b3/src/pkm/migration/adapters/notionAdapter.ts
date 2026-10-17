/**
 * P40 — Notion Migration Adapter
 * High fidelity importer for official Notion exports (Markdown & CSV):
 * Strips 32-char hex ID suffixes, preserves subpage hierarchy, converts database CSVs into notes
 * with typed frontmatter, maps callouts/checklists, and resolves internal Notion links into Wikilinks.
 */

import { AdapterParseResult, getBaseFileName, getFolderPath, getMimeTypeFromPath, isAttachmentFile, MigrationAdapter } from './baseAdapter';
import { AttachmentCandidate, FolderCandidate, MigrationPlan, MigrationProgress, MigrationWarning, NoteCandidate, RawImportFile } from '../migrationTypes';
import { parseFrontmatter } from '../../parser';
import { computeContentHash, sanitizeRelativePath } from '../securitySanitizer';

/**
 * Strips Notion's 32-character hexadecimal export suffix from a title or folder name.
 * e.g. "Meeting Notes 1234567890abcdef1234567890abcdef" -> "Meeting Notes"
 */
export function cleanNotionTitle(rawName: string): { title: string; notionId?: string } {
  const match = rawName.match(/^(.*?)(?:\s+([0-9a-f]{32}))?$/i);
  if (match && match[2]) {
    return {
      title: match[1].trim() || 'Untitled Page',
      notionId: match[2].toLowerCase(),
    };
  }
  return { title: rawName.trim() };
}

export class NotionAdapter implements MigrationAdapter {
  id = 'notion' as const;
  displayName = 'Notion Export (Markdown & CSV)';
  description = 'Cleans export hash IDs, preserves subpage hierarchies, converts database CSVs into notes with properties, and resolves internal page links.';

  async parse(
    files: RawImportFile[],
    plan: MigrationPlan,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<AdapterParseResult> {
    const notes: NoteCandidate[] = [];
    const attachments: AttachmentCandidate[] = [];
    const foldersMap = new Map<string, FolderCandidate>();
    const warnings: MigrationWarning[] = [];

    // Map Notion 32-char IDs and filenames to clean note titles for link resolution
    const notionIdToTitleMap = new Map<string, string>();
    const totalFiles = files.length;
    let processed = 0;

    // First pass: Build ID-to-title and folder hierarchy maps
    for (const file of files) {
      const { safePath } = sanitizeRelativePath(file.path);
      const baseName = getBaseFileName(safePath);
      const { title, notionId } = cleanNotionTitle(baseName);

      if (notionId) {
        notionIdToTitleMap.set(notionId, title);
        notionIdToTitleMap.set(baseName.toLowerCase(), title);
      }
    }

    // Second pass: Process notes, databases, and attachments
    for (const file of files) {
      processed++;
      if (onProgress && processed % 50 === 0) {
        onProgress({
          stage: 'converting',
          progressPercentage: Math.round((processed / totalFiles) * 100),
          currentMessage: `Processing Notion export: ${file.name} (${processed}/${totalFiles})`,
          processedItems: processed,
          totalItems: totalFiles,
        });
      }

      const { safePath, isTraveralAttempt } = sanitizeRelativePath(file.path);
      if (isTraveralAttempt) {
        warnings.push({
          id: `warn_traversal_${file.name}`,
          severity: 'blocking',
          category: 'unsupported-syntax',
          message: `Path traversal attempt prevented: ${file.path}`,
          sourcePath: file.path,
        });
        continue;
      }

      // Build cleaned folder hierarchy
      const rawFolderPath = getFolderPath(safePath);
      let cleanFolderPath = '';
      if (rawFolderPath) {
        const segs = rawFolderPath.split('/').map((s) => cleanNotionTitle(s).title);
        let cur = '';
        for (const seg of segs) {
          const parent = cur;
          cur = cur ? `${cur}/${seg}` : seg;
          if (!foldersMap.has(cur)) {
            foldersMap.set(cur, {
              id: `folder_${cur.replace(/[^a-zA-Z0-9]/g, '_')}`,
              path: cur,
              name: seg,
              parentPath: parent || undefined,
            });
          }
        }
        cleanFolderPath = segs.join('/');
      }

      const ext = (file.name.split('.').pop() || '').toLowerCase();

      // 1. Notion Database CSV Export
      if (ext === 'csv') {
        try {
          const csvText = await file.readAsText();
          const baseName = getBaseFileName(safePath);
          const { title: dbTitle } = cleanNotionTitle(baseName);

          const rows = parseSimpleCsv(csvText);
          if (rows.length > 1) {
            const headers = rows[0];
            const titleColIndex = 0; // Usually first column is Name/Title in Notion CSV export

            for (let r = 1; r < rows.length; r++) {
              const row = rows[r];
              if (!row || row.length === 0 || row.every((c) => !c.trim())) continue;

              const rawRowTitle = row[titleColIndex] || `Untitled Row ${r}`;
              const { title: rowTitle } = cleanNotionTitle(rawRowTitle);

              const frontmatter: Record<string, any> = {
                database: dbTitle,
              };

              // Map other columns to frontmatter properties
              for (let c = 0; c < headers.length; c++) {
                if (c === titleColIndex) continue;
                const header = headers[c].trim();
                const val = (row[c] || '').trim();
                if (!header || !val) continue;

                // Check for multi-select / comma separated values
                if (val.includes(',') && !val.startsWith('http')) {
                  frontmatter[header] = val.split(',').map((v) => v.trim());
                } else if (val.toLowerCase() === 'yes' || val.toLowerCase() === 'true') {
                  frontmatter[header] = true;
                } else if (val.toLowerCase() === 'no' || val.toLowerCase() === 'false') {
                  frontmatter[header] = false;
                } else if (!isNaN(Number(val)) && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                  frontmatter[header] = Number(val);
                } else {
                  frontmatter[header] = val;
                }
              }

              const rowMarkdown = `# ${rowTitle}\n\n*Imported row from Notion database **${dbTitle}**.*\n`;
              const hash = await computeContentHash(rowMarkdown + JSON.stringify(frontmatter));

              const dbFolder = cleanFolderPath ? `${cleanFolderPath}/${dbTitle}` : dbTitle;
              if (!foldersMap.has(dbFolder)) {
                foldersMap.set(dbFolder, {
                  id: `folder_${dbFolder.replace(/[^a-zA-Z0-9]/g, '_')}`,
                  path: dbFolder,
                  name: dbTitle,
                  parentPath: cleanFolderPath || undefined,
                });
              }

              notes.push({
                id: `notion_db_${hash.substring(0, 16)}`,
                sourcePath: `${safePath}_row_${r}.md`,
                title: rowTitle,
                rawMarkdown: rowMarkdown,
                frontmatter,
                folderPath: dbFolder,
                tags: [],
                aliases: [],
                links: [],
                attachments: [],
                provenance: {
                  sourceType: 'notion',
                  originalPath: file.path,
                  importTimestamp: Date.now(),
                  sourceHash: hash,
                },
              });
            }
          }
        } catch (err: any) {
          warnings.push({
            id: `warn_notion_csv_${file.name}`,
            severity: 'warning',
            category: 'formula-rollup-degraded',
            message: `Failed to parse Notion database CSV: ${file.name}`,
            sourcePath: file.path,
          });
        }
        continue;
      }

      // 2. Notion Markdown Note (.md)
      if (ext === 'md' || ext === 'markdown') {
        try {
          let text = await file.readAsText();
          if (text.charCodeAt(0) === 0xfeff) text = text.substring(1);

          const baseName = getBaseFileName(safePath);
          const { title: defaultTitle, notionId } = cleanNotionTitle(baseName);

          const { frontmatter, body } = parseFrontmatter(text);
          let title = (frontmatter.title as string) || defaultTitle;

          // If note starts with `# Title`, extract clean title
          const h1Match = body.match(/^#\s+(.+)$/m);
          if (h1Match && h1Match[1].trim()) {
            title = cleanNotionTitle(h1Match[1].trim()).title;
          }

          // Rewrite Notion internal relative page links to canonical Wikilinks
          // e.g. [Subpage Title](Subpage%20Title%201234567890abcdef.md) -> [[Subpage Title]]
          let rewrittenBody = body.replace(/\[([^\]]+)\]\(([^)]+\.md)\)/g, (match, label, linkPath) => {
            const decodedPath = decodeURIComponent(linkPath);
            const targetBase = getBaseFileName(decodedPath);
            const { title: targetTitle } = cleanNotionTitle(targetBase);

            if (targetTitle) {
              return `[[${targetTitle}${label && label !== targetTitle ? `|${label}` : ''}]]`;
            }
            return match;
          });

          // Convert Notion callouts (> 💡 Note) to P21 callouts (> [!NOTE])
          rewrittenBody = rewrittenBody.replace(/^>\s*(?:💡|📌|ℹ️|⚠️|🔥|✅)\s*(.*)$/gm, (match, content) => {
            return `> [!NOTE]\n> ${content}`;
          });

          const hash = await computeContentHash(text);
          const links: NoteCandidate['links'] = [];
          const noteAttachments: string[] = [];

          // Extract Wikilinks
          const wikiRegex = /(!)?\[\[(.*?)\]\]/g;
          let match: RegExpExecArray | null;
          while ((match = wikiRegex.exec(rewrittenBody)) !== null) {
            const isEmbed = !!match[1];
            const rawInner = match[2].trim();
            const pipeIdx = rawInner.indexOf('|');
            const target = pipeIdx >= 0 ? rawInner.substring(0, pipeIdx).trim() : rawInner;
            const label = pipeIdx >= 0 ? rawInner.substring(pipeIdx + 1).trim() : undefined;

            links.push({
              target,
              label,
              isWikilink: true,
              isEmbed,
            });

            if (isAttachmentFile(target)) {
              noteAttachments.push(target);
            }
          }

          // Extract Images and remaining markdown links
          const mdLinkRegex = /(!)?\[([^\]]*)\]\(([^)]+)\)/g;
          while ((match = mdLinkRegex.exec(rewrittenBody)) !== null) {
            const isEmbed = !!match[1];
            const label = match[2];
            const url = match[3].trim();

            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              links.push({
                target: url,
                label,
                isWikilink: false,
                isEmbed,
              });

              if (isAttachmentFile(url)) {
                noteAttachments.push(url);
              }
            }
          }

          notes.push({
            id: `notion_${notionId || hash.substring(0, 16)}`,
            sourcePath: safePath,
            sourceOriginalId: notionId,
            title,
            rawMarkdown: rewrittenBody,
            frontmatter,
            createdTime: file.lastModified,
            modifiedTime: file.lastModified,
            folderPath: cleanFolderPath || undefined,
            tags: [],
            aliases: [],
            links,
            attachments: Array.from(new Set(noteAttachments)),
            provenance: {
              sourceType: 'notion',
              originalPath: file.path,
              importTimestamp: Date.now(),
              sourceHash: hash,
            },
          });
        } catch (err: any) {
          warnings.push({
            id: `warn_read_notion_${file.name}`,
            severity: 'warning',
            category: 'malformed-metadata',
            message: `Failed to read Notion note: ${file.name}`,
            sourcePath: file.path,
          });
        }
      } else if (isAttachmentFile(file.name)) {
        // Attachment
        try {
          const blob = await file.readAsBlob();
          const buffer = await file.readAsArrayBuffer();
          const hash = await computeContentHash(buffer);

          attachments.push({
            id: `att_${hash.substring(0, 16)}`,
            sourcePath: safePath,
            originalName: file.name,
            mimeType: getMimeTypeFromPath(file.name),
            size: file.size,
            blob,
            hash,
            referencedByNotePaths: [],
          });
        } catch (err: any) {
          warnings.push({
            id: `warn_att_notion_${file.name}`,
            severity: 'warning',
            category: 'missing-attachment',
            message: `Failed to load Notion attachment: ${file.name}`,
            sourcePath: file.path,
          });
        }
      }
    }

    return {
      notes,
      attachments,
      canvases: [],
      references: [],
      folders: Array.from(foldersMap.values()),
      warnings,
    };
  }
}

/**
 * Robust CSV parser for Notion database exports that handles quoted multi-line fields.
 */
function parseSimpleCsv(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        // Ignore CR
      } else if (char === '\n') {
        currentRow.push(currentField);
        lines.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    lines.push(currentRow);
  }

  return lines;
}
