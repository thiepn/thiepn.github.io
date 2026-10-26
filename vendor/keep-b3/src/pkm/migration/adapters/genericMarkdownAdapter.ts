/**
 * P40 — Generic Markdown Migration Adapter
 * High fidelity importer for standard Markdown hierarchies, folders, YAML frontmatter, and attachments.
 */

import { AdapterParseResult, getBaseFileName, getFolderPath, getMimeTypeFromPath, isAttachmentFile, MigrationAdapter } from './baseAdapter';
import { AttachmentCandidate, FolderCandidate, MigrationPlan, MigrationProgress, MigrationWarning, NoteCandidate, RawImportFile } from '../migrationTypes';
import { parseFrontmatter } from '../../parser';
import { computeContentHash, sanitizeRelativePath } from '../securitySanitizer';

export class GenericMarkdownAdapter implements MigrationAdapter {
  id = 'generic-markdown' as const;
  displayName = 'Generic Markdown & Folders';
  description = 'Imports folders of standard Markdown files (.md), frontmatter, and embedded media attachments.';

  async parse(
    files: RawImportFile[],
    plan: MigrationPlan,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<AdapterParseResult> {
    const notes: NoteCandidate[] = [];
    const attachments: AttachmentCandidate[] = [];
    const foldersMap = new Map<string, FolderCandidate>();
    const warnings: MigrationWarning[] = [];

    const totalFiles = files.length;
    let processed = 0;

    for (const file of files) {
      processed++;
      if (onProgress && processed % 50 === 0) {
        onProgress({
          stage: 'converting',
          progressPercentage: Math.round((processed / totalFiles) * 100),
          currentMessage: `Processing ${file.name} (${processed}/${totalFiles})`,
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
      if (folderPath) {
        // Register folder hierarchy
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

      // Check if Markdown Note
      if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
        try {
          let text = await file.readAsText();

          // Strip UTF-8 BOM if present
          if (text.charCodeAt(0) === 0xfeff) {
            text = text.substring(1);
          }

          const { frontmatter, body } = parseFrontmatter(text);
          const title = (frontmatter.title as string) || getBaseFileName(safePath);
          const hash = await computeContentHash(text);

          // Extract tags from frontmatter and inline
          const tags: string[] = [];
          const rawTags: unknown = frontmatter.tags;
          if (Array.isArray(rawTags)) {
            rawTags.forEach((t) => typeof t === 'string' && tags.push(t.replace(/^#/, '')));
          } else if (typeof rawTags === 'string') {
            rawTags.split(',').forEach((t) => tags.push(t.trim().replace(/^#/, '')));
          }

          // Extract inline tags
          const inlineTagMatches = body.match(/(?:^|\s)#[a-zA-Z0-9_\-\/]+/g);
          if (inlineTagMatches) {
            inlineTagMatches.forEach((m) => {
              const cleaned = m.trim().replace(/^#/, '');
              if (!tags.includes(cleaned)) tags.push(cleaned);
            });
          }

          // Extract aliases
          const aliases: string[] = [];
          const rawAliases: unknown = frontmatter.aliases;
          if (Array.isArray(rawAliases)) {
            rawAliases.forEach((a) => typeof a === 'string' && aliases.push(a.trim()));
          } else if (typeof rawAliases === 'string') {
            rawAliases.split(',').forEach((a) => aliases.push(a.trim()));
          }

          // Extract links
          const links: NoteCandidate['links'] = [];
          const noteAttachments: string[] = [];

          // 1. Wikilinks [[Target|Label]] or ![[Target]]
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

          // 2. Standard Markdown links [Label](url) and images ![Alt](url)
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
            id: `note_${hash.substring(0, 16)}`,
            sourcePath: safePath,
            title,
            rawMarkdown: text,
            frontmatter,
            createdTime: file.lastModified,
            modifiedTime: file.lastModified,
            folderPath: folderPath || undefined,
            tags,
            aliases,
            links,
            attachments: Array.from(new Set(noteAttachments)),
            provenance: {
              sourceType: 'generic-markdown',
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
            message: `Failed to read Markdown note: ${file.name} (${err?.message || 'Error'})`,
            sourcePath: file.path,
          });
        }
      } else if (isAttachmentFile(file.name)) {
        // Process Attachment
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
            message: `Failed to load attachment: ${file.name}`,
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
