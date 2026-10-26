/**
 * P40 — Evernote ENEX Migration Adapter
 * Robust XML DOM parser for Evernote export (.enex) files.
 * Converts ENML to Markdown, decodes base64 attachments, maps checkboxes/tags,
 * maps notebooks to folders, and preserves encrypted blocks safely.
 */

import { AdapterParseResult, getBaseFileName, getMimeTypeFromPath, MigrationAdapter } from './baseAdapter';
import { AttachmentCandidate, FolderCandidate, MigrationPlan, MigrationProgress, MigrationWarning, NoteCandidate, RawImportFile } from '../migrationTypes';
import { convertHTMLToMarkdown } from '../../htmlToMarkdown';
import { computeContentHash, parseSafeXml, sanitizeUntrustedHtml } from '../securitySanitizer';

export class EvernoteAdapter implements MigrationAdapter {
  id = 'evernote-enex' as const;
  displayName = 'Evernote (.enex Archive)';
  description = 'Converts Evernote notebooks, notes, ENML rich text, tags, checkboxes, and base64 media attachments.';

  async parse(
    files: RawImportFile[],
    plan: MigrationPlan,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<AdapterParseResult> {
    const notes: NoteCandidate[] = [];
    const attachments: AttachmentCandidate[] = [];
    const foldersMap = new Map<string, FolderCandidate>();
    const warnings: MigrationWarning[] = [];

    const enexFiles = files.filter((f) => f.name.toLowerCase().endsWith('.enex'));
    const totalFiles = enexFiles.length;
    let fileIndex = 0;

    for (const file of enexFiles) {
      fileIndex++;
      const notebookName = getBaseFileName(file.name) || 'Evernote Import';
      if (!foldersMap.has(notebookName)) {
        foldersMap.set(notebookName, {
          id: `folder_${notebookName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          path: notebookName,
          name: notebookName,
        });
      }

      if (onProgress) {
        onProgress({
          stage: 'converting',
          progressPercentage: Math.round((fileIndex / totalFiles) * 50),
          currentMessage: `Reading Evernote notebook: ${notebookName} (${fileIndex}/${totalFiles})`,
          processedItems: fileIndex,
          totalItems: totalFiles,
        });
      }

      try {
        const xmlText = await file.readAsText();
        const { doc, error } = parseSafeXml(xmlText);

        if (!doc || error) {
          warnings.push({
            id: `warn_enex_xml_${file.name}`,
            severity: 'blocking',
            category: 'malformed-metadata',
            message: `Failed to parse ENEX XML for ${file.name}: ${error}`,
            sourcePath: file.path,
          });
          continue;
        }

        const noteNodes = Array.from(doc.querySelectorAll('note'));
        let noteIndex = 0;

        for (const noteEl of noteNodes) {
          noteIndex++;
          const title = noteEl.querySelector('title')?.textContent?.trim() || `Evernote Note ${noteIndex}`;
          const createdRaw = noteEl.querySelector('created')?.textContent?.trim();
          const updatedRaw = noteEl.querySelector('updated')?.textContent?.trim();
          const sourceUrl = noteEl.querySelector('note-attributes source-url')?.textContent?.trim();

          const createdTime = createdRaw ? parseEvernoteDate(createdRaw) : Date.now();
          const modifiedTime = updatedRaw ? parseEvernoteDate(updatedRaw) : createdTime;

          // Extract tags
          const tags: string[] = [];
          const tagNodes = Array.from(noteEl.querySelectorAll('tag'));
          tagNodes.forEach((t) => {
            const val = t.textContent?.trim();
            if (val) tags.push(val.replace(/^#/, ''));
          });

          // Process resources (attachments)
          const resourceNodes = Array.from(noteEl.querySelectorAll('resource'));
          const noteAttachments: string[] = [];
          const resourceHashMap = new Map<string, { fileName: string; mime: string }>();

          for (const resEl of resourceNodes) {
            try {
              const dataEl = resEl.querySelector('data');
              const mimeEl = resEl.querySelector('mime');
              const filenameEl = resEl.querySelector('resource-attributes file-name');
              const recoIndexEl = resEl.querySelector('recognition');

              const mime = mimeEl?.textContent?.trim() || 'application/octet-stream';
              const base64Data = (dataEl?.textContent || '').replace(/\s+/g, '');
              const origName = filenameEl?.textContent?.trim() || `attachment_${attachments.length + 1}.${mime.split('/')[1] || 'bin'}`;

              if (base64Data) {
                // Decode base64 to binary blob
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mime });
                const hash = await computeContentHash(byteArray.buffer);

                const safeAttPath = `${notebookName}/${origName}`;
                attachments.push({
                  id: `enex_att_${hash.substring(0, 16)}`,
                  sourcePath: safeAttPath,
                  originalName: origName,
                  mimeType: mime,
                  size: byteArray.length,
                  blob,
                  hash,
                  referencedByNotePaths: [file.path],
                });

                noteAttachments.push(origName);

                // Check for MD5 hash attribute in recognition or hash calculation
                resourceHashMap.set(hash, { fileName: origName, mime });
              }
            } catch (err: any) {
              warnings.push({
                id: `warn_res_${title}_${noteAttachments.length}`,
                severity: 'warning',
                category: 'missing-attachment',
                message: `Failed to decode attachment in Evernote note: ${title}`,
                noteTitle: title,
                sourcePath: file.path,
              });
            }
          }

          // Process ENML Content
          const contentEl = noteEl.querySelector('content');
          const rawEnml = contentEl?.textContent || '';

          // Convert ENML to canonical Markdown
          let markdown = convertEnmlToMarkdown(rawEnml, resourceHashMap, warnings, title, file.path);

          // Handle encrypted blocks (<en-crypt>)
          if (rawEnml.includes('<en-crypt')) {
            warnings.push({
              id: `warn_crypt_${title}`,
              severity: 'warning',
              category: 'encrypted-content',
              message: `Evernote encrypted block detected in "${title}". Raw encrypted payload preserved.`,
              noteTitle: title,
              sourcePath: file.path,
              remediation: 'Decrypt content in Evernote desktop before exporting if needed.',
            });
          }

          const frontmatter: Record<string, any> = {};
          if (sourceUrl) frontmatter.source_url = sourceUrl;
          if (tags.length > 0) frontmatter.tags = tags;

          const hash = await computeContentHash(markdown);

          notes.push({
            id: `enex_${hash.substring(0, 16)}`,
            sourcePath: `${notebookName}/${title}.md`,
            title,
            rawMarkdown: markdown,
            frontmatter,
            createdTime,
            modifiedTime,
            folderPath: notebookName,
            tags,
            aliases: [],
            links: [],
            attachments: noteAttachments,
            provenance: {
              sourceType: 'evernote-enex',
              originalPath: file.path,
              importTimestamp: Date.now(),
              sourceHash: hash,
            },
          });
        }
      } catch (err: any) {
        warnings.push({
          id: `warn_enex_file_${file.name}`,
          severity: 'blocking',
          category: 'malformed-metadata',
          message: `Failed to process ENEX file ${file.name}: ${err?.message || 'Error'}`,
          sourcePath: file.path,
        });
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
 * Converts Evernote date format e.g. "20230514T153022Z" to UNIX timestamp ms.
 */
function parseEvernoteDate(dateStr: string): number {
  try {
    const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
    if (match) {
      const d = new Date(
        Date.UTC(
          parseInt(match[1], 10),
          parseInt(match[2], 10) - 1,
          parseInt(match[3], 10),
          parseInt(match[4], 10),
          parseInt(match[5], 10),
          parseInt(match[6], 10)
        )
      );
      return d.getTime();
    }
    return new Date(dateStr).getTime() || Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * Converts Evernote ENML XML into clean Markdown with task checkboxes and embedded attachments.
 */
function convertEnmlToMarkdown(
  enml: string,
  resourceMap: Map<string, { fileName: string; mime: string }>,
  warnings: MigrationWarning[],
  noteTitle: string,
  sourcePath: string
): string {
  if (!enml) return '';

  // 1. Replace <en-todo checked="true"/> and <en-todo checked="false"/>
  let transformed = enml.replace(/<en-todo\s+checked="true"\s*\/?>/gi, '- [x] ');
  transformed = transformed.replace(/<en-todo\s+checked="false"\s*\/?>/gi, '- [ ] ');
  transformed = transformed.replace(/<en-todo\s*\/?>/gi, '- [ ] ');

  // 2. Replace <en-media hash="..." type="..."/> with canonical Markdown attachment embeds
  transformed = transformed.replace(/<en-media[^>]*hash="([^"]+)"[^>]*>/gi, (match, hash) => {
    const res = resourceMap.get(hash);
    if (res) {
      return res.mime.startsWith('image/') ? `\n\n![[${res.fileName}]]\n\n` : `\n\n[[${res.fileName}]]\n\n`;
    }
    return `\n\n![[Attachment_${hash.substring(0, 8)}]]\n\n`;
  });

  // 3. Replace <en-crypt ...> ... </en-crypt> with preserved inert markdown callout
  transformed = transformed.replace(/<en-crypt[^>]*>([\s\S]*?)<\/en-crypt>/gi, (match, cryptBody) => {
    return `\n\n> [!WARNING] Evernote Encrypted Section\n> \`\`\`encrypted\n> ${cryptBody.trim()}\n> \`\`\`\n\n`;
  });

  // 4. Sanitize and convert HTML to Markdown using canonical converter
  const sanitized = sanitizeUntrustedHtml(transformed);
  const mdResult = convertHTMLToMarkdown(sanitized);

  return (mdResult.markdown || '').trim();
}
