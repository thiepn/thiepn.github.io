/**
 * P40 — Obsidian Migration Adapter
 * High fidelity importer for Obsidian vaults: Wikilinks, embeds, callouts, block IDs, .canvas whiteboards,
 * daily notes, and safe handling of community plugin blocks.
 */

import { AdapterParseResult, getBaseFileName, getFolderPath, getMimeTypeFromPath, isAttachmentFile, MigrationAdapter } from './baseAdapter';
import { AttachmentCandidate, CanvasCandidate, FolderCandidate, MigrationPlan, MigrationProgress, MigrationWarning, NoteCandidate, RawImportFile } from '../migrationTypes';
import { parseFrontmatter } from '../../parser';
import { computeContentHash, neutralizeExecutableMarkdownBlocks, sanitizeRelativePath } from '../securitySanitizer';

export class ObsidianAdapter implements MigrationAdapter {
  id = 'obsidian' as const;
  displayName = 'Obsidian Vault';
  description = 'Preserves Wikilinks, aliases, callouts, block IDs, .canvas whiteboards, daily notes, and nested folders.';

  async parse(
    files: RawImportFile[],
    plan: MigrationPlan,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<AdapterParseResult> {
    const notes: NoteCandidate[] = [];
    const attachments: AttachmentCandidate[] = [];
    const canvases: CanvasCandidate[] = [];
    const foldersMap = new Map<string, FolderCandidate>();
    const warnings: MigrationWarning[] = [];

    // Filter out .obsidian plugins and cache directories from content processing
    const contentFiles = files.filter((f) => {
      const p = f.path.replace(/\\/g, '/');
      if (p.includes('.obsidian/plugins/') || p.includes('.obsidian/cache/')) return false;
      if (p.includes('.trash/') || p.includes('.git/')) return false;
      return true;
    });

    const totalFiles = contentFiles.length;
    let processed = 0;

    for (const file of contentFiles) {
      processed++;
      if (onProgress && processed % 50 === 0) {
        onProgress({
          stage: 'converting',
          progressPercentage: Math.round((processed / totalFiles) * 100),
          currentMessage: `Parsing Obsidian file: ${file.name} (${processed}/${totalFiles})`,
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
          message: `Path traversal attempt prevented for file: ${file.path}`,
          sourcePath: file.path,
        });
        continue;
      }

      const folderPath = getFolderPath(safePath);
      if (folderPath && !folderPath.startsWith('.obsidian')) {
        const segs = folderPath.split('/');
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
      }

      const ext = (file.name.split('.').pop() || '').toLowerCase();

      // 1. Obsidian Canvas Whiteboard (.canvas)
      if (ext === 'canvas') {
        if (plan.importCanvas) {
          try {
            const canvasText = await file.readAsText();
            const canvasData = JSON.parse(canvasText);

            // Canonicalize canvas structure
            const nodes = Array.isArray(canvasData.nodes) ? canvasData.nodes : [];
            const edges = Array.isArray(canvasData.edges) ? canvasData.edges : [];

            canvases.push({
              id: `canvas_${getBaseFileName(safePath)}_${Date.now()}`,
              sourcePath: safePath,
              title: getBaseFileName(safePath),
              nodesCount: nodes.length,
              edgesCount: edges.length,
              canvasJson: JSON.stringify({
                id: `canvas_${getBaseFileName(safePath)}`,
                title: getBaseFileName(safePath),
                nodes,
                edges,
                version: 1,
              }),
            });
          } catch (err: any) {
            warnings.push({
              id: `warn_canvas_${file.name}`,
              severity: 'warning',
              category: 'unsupported-syntax',
              message: `Failed to parse Obsidian .canvas JSON for ${file.name}`,
              sourcePath: file.path,
            });
          }
        }
        continue;
      }

      // 2. Obsidian Markdown Note (.md)
      if (ext === 'md' || ext === 'markdown') {
        try {
          let text = await file.readAsText();
          if (text.charCodeAt(0) === 0xfeff) text = text.substring(1);

          // Neutralize any Dataview or active JS plugin blocks safely
          text = neutralizeExecutableMarkdownBlocks(text, warnings, safePath);

          const { frontmatter, body } = parseFrontmatter(text);
          const title = (frontmatter.title as string) || getBaseFileName(safePath);
          const hash = await computeContentHash(text);

          // Tags
          const tags: string[] = [];
          const rawTags: unknown = frontmatter.tags;
          if (Array.isArray(rawTags)) {
            rawTags.forEach((t) => typeof t === 'string' && tags.push(t.replace(/^#/, '')));
          } else if (typeof rawTags === 'string') {
            rawTags.split(/[\s,]+/).forEach((t) => t && tags.push(t.trim().replace(/^#/, '')));
          }

          // Inline tags #tag/subtag
          const inlineTagMatches = body.match(/(?:^|\s)#[a-zA-Z0-9_\-\/]+/g);
          if (inlineTagMatches) {
            inlineTagMatches.forEach((m) => {
              const cleaned = m.trim().replace(/^#/, '');
              if (!tags.includes(cleaned)) tags.push(cleaned);
            });
          }

          // Aliases
          const aliases: string[] = [];
          const rawAliases: unknown = frontmatter.aliases;
          if (Array.isArray(rawAliases)) {
            rawAliases.forEach((a) => typeof a === 'string' && aliases.push(a.trim()));
          } else if (typeof rawAliases === 'string') {
            rawAliases.split(/[\s,]+/).forEach((a) => a && aliases.push(a.trim()));
          }

          // Check for Daily Note format (e.g. YYYY-MM-DD.md)
          let isDailyNote = false;
          let dailyNoteDate: string | undefined;
          const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})\.md$/i);
          if (plan.mapDailyNotes && dateMatch) {
            isDailyNote = true;
            dailyNoteDate = dateMatch[1];
          }

          // Links and Media references
          const links: NoteCandidate['links'] = [];
          const noteAttachments: string[] = [];

          // Wikilinks [[Target|Label]] & Embeds ![[Target]]
          const wikiRegex = /(!)?\[\[(.*?)\]\]/g;
          let match: RegExpExecArray | null;
          while ((match = wikiRegex.exec(body)) !== null) {
            const isEmbed = !!match[1];
            const rawInner = match[2].trim();
            const pipeIdx = rawInner.indexOf('|');
            const targetWithAnchor = pipeIdx >= 0 ? rawInner.substring(0, pipeIdx).trim() : rawInner;
            const label = pipeIdx >= 0 ? rawInner.substring(pipeIdx + 1).trim() : undefined;

            let target = targetWithAnchor;
            let heading: string | undefined;
            let blockId: string | undefined;

            if (target.includes('#^')) {
              const parts = target.split('#^');
              target = parts[0];
              blockId = parts[1];
            } else if (target.includes('#')) {
              const parts = target.split('#');
              target = parts[0];
              heading = parts[1];
            }

            links.push({
              target,
              label,
              isWikilink: true,
              isEmbed,
              heading,
              blockId,
            });

            if (isAttachmentFile(target)) {
              noteAttachments.push(target);
            }
          }

          // Standard links
          const mdLinkRegex = /(!)?\[([^\]]*)\]\(([^)]+)\)/g;
          while ((match = mdLinkRegex.exec(body)) !== null) {
            const isEmbed = !!match[1];
            const label = match[2];
            const url = match[3].trim();

            if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
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
            id: `obsidian_${hash.substring(0, 16)}`,
            sourcePath: safePath,
            title,
            rawMarkdown: text,
            frontmatter,
            createdTime: file.lastModified,
            modifiedTime: file.lastModified,
            folderPath: folderPath || undefined,
            tags,
            aliases,
            isDailyNote,
            dailyNoteDate,
            links,
            attachments: Array.from(new Set(noteAttachments)),
            provenance: {
              sourceType: 'obsidian',
              originalPath: file.path,
              importTimestamp: Date.now(),
              sourceHash: hash,
            },
          });
        } catch (err: any) {
          warnings.push({
            id: `warn_read_${file.name}`,
            severity: 'warning',
            category: 'malformed-metadata',
            message: `Failed to parse Obsidian note: ${file.name} (${err?.message || 'Error'})`,
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
            id: `warn_att_${file.name}`,
            severity: 'warning',
            category: 'missing-attachment',
            message: `Failed to load Obsidian attachment: ${file.name}`,
            sourcePath: file.path,
          });
        }
      }
    }

    return {
      notes,
      attachments,
      canvases,
      references: [],
      folders: Array.from(foldersMap.values()),
      warnings,
    };
  }
}
