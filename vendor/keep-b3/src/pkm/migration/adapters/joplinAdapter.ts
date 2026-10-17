/**
 * P40 — Joplin Migration Adapter
 * Importer for Joplin Markdown export directories:
 * Extracts Joplin metadata, resolves Joplin resource links (":/resourceId" -> attachments),
 * and maps notebook structures.
 */

import { AdapterParseResult, getBaseFileName, getFolderPath, getMimeTypeFromPath, isAttachmentFile, MigrationAdapter } from './baseAdapter';
import { AttachmentCandidate, FolderCandidate, MigrationPlan, MigrationProgress, MigrationWarning, NoteCandidate, RawImportFile } from '../migrationTypes';
import { computeContentHash, sanitizeRelativePath } from '../securitySanitizer';

export class JoplinAdapter implements MigrationAdapter {
  id = 'joplin' as const;
  displayName = 'Joplin Markdown Export';
  description = 'Resolves Joplin resource attachments (:/id), metadata footers, tags, and notebook hierarchies.';

  async parse(
    files: RawImportFile[],
    plan: MigrationPlan,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<AdapterParseResult> {
    const notes: NoteCandidate[] = [];
    const attachments: AttachmentCandidate[] = [];
    const foldersMap = new Map<string, FolderCandidate>();
    const warnings: MigrationWarning[] = [];

    // Map Joplin resource IDs to filenames
    const resourceIdToPathMap = new Map<string, string>();
    const totalFiles = files.length;
    let processed = 0;

    // First pass: locate resources
    for (const file of files) {
      const { safePath } = sanitizeRelativePath(file.path);
      if (safePath.includes('_resources/') || safePath.includes('resources/')) {
        const resId = getBaseFileName(file.name);
        resourceIdToPathMap.set(resId, safePath);
        resourceIdToPathMap.set(file.name, safePath);
      }
    }

    // Second pass: process notes & attachments
    for (const file of files) {
      processed++;
      if (onProgress && processed % 50 === 0) {
        onProgress({
          stage: 'converting',
          progressPercentage: Math.round((processed / totalFiles) * 100),
          currentMessage: `Processing Joplin note: ${file.name} (${processed}/${totalFiles})`,
          processedItems: processed,
          totalItems: totalFiles,
        });
      }

      const { safePath, isTraveralAttempt } = sanitizeRelativePath(file.path);
      if (isTraveralAttempt) continue;

      const folderPath = getFolderPath(safePath);
      if (folderPath && !folderPath.includes('resources')) {
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

      if (ext === 'md' || ext === 'markdown') {
        try {
          let text = await file.readAsText();
          if (text.charCodeAt(0) === 0xfeff) text = text.substring(1);

          // Joplin stores metadata at bottom in format:
          // id: 123456...
          // parent_id: ...
          // created_time: 2023-01-01T00:00:00.000Z
          // updated_time: ...
          // is_conflict: 0
          // type_: 1
          let bodyText = text;
          const frontmatter: Record<string, any> = {};
          let createdTime: number | undefined;
          let modifiedTime: number | undefined;

          const metaMatch = text.match(/\n\nid:\s*([a-f0-9]+)[\s\S]*$/i);
          if (metaMatch) {
            bodyText = text.substring(0, metaMatch.index).trim();
            const metaLines = metaMatch[0].trim().split('\n');
            metaLines.forEach((l) => {
              const idx = l.indexOf(':');
              if (idx > 0) {
                const k = l.substring(0, idx).trim();
                const v = l.substring(idx + 1).trim();
                frontmatter[k] = v;
                if (k === 'created_time') createdTime = new Date(v).getTime();
                if (k === 'updated_time') modifiedTime = new Date(v).getTime();
              }
            });
          }

          // Extract title from first H1 or filename
          let title = getBaseFileName(safePath);
          const h1Match = bodyText.match(/^#\s+(.+)$/m);
          if (h1Match && h1Match[1].trim()) {
            title = h1Match[1].trim();
          }

          // Rewrite Joplin resource links: [file](:/32hex) or ![img](:/32hex)
          const noteAttachments: string[] = [];
          bodyText = bodyText.replace(/(!)?\[([^\]]*)\]\(:\/([a-f0-9]+)\)/gi, (match, isEmbed, label, resId) => {
            const target = resourceIdToPathMap.get(resId) || `resource_${resId}`;
            const targetName = target.split('/').pop() || target;
            noteAttachments.push(targetName);
            return isEmbed ? `![[${targetName}]]` : `[[${targetName}${label ? `|${label}` : ''}]]`;
          });

          const hash = await computeContentHash(bodyText);

          notes.push({
            id: `joplin_${hash.substring(0, 16)}`,
            sourcePath: safePath,
            sourceOriginalId: frontmatter.id,
            title,
            rawMarkdown: bodyText,
            frontmatter,
            createdTime: createdTime || file.lastModified,
            modifiedTime: modifiedTime || file.lastModified,
            folderPath: folderPath || undefined,
            tags: [],
            aliases: [],
            links: [],
            attachments: Array.from(new Set(noteAttachments)),
            provenance: {
              sourceType: 'joplin',
              originalPath: file.path,
              importTimestamp: Date.now(),
              sourceHash: hash,
            },
          });
        } catch (err: any) {
          warnings.push({
            id: `warn_joplin_read_${file.name}`,
            severity: 'warning',
            category: 'malformed-metadata',
            message: `Failed to read Joplin note: ${file.name}`,
            sourcePath: file.path,
          });
        }
      } else if (isAttachmentFile(file.name)) {
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
            id: `warn_att_joplin_${file.name}`,
            severity: 'warning',
            category: 'missing-attachment',
            message: `Failed to load Joplin resource: ${file.name}`,
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
