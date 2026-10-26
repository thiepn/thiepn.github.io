/**
 * PKM V1.8: Markdown Transformation Engine
 * Produces 100% portable CommonMark / GFM Markdown and Native PKM Markdown.
 */

import { Note, Folder } from '../../types';
import { parseFrontmatter, slugify } from '../parser';
import { stripBlockIdsFromMarkdown } from '../transclusion';
import { ExportScopeConfig, ExportFormat } from './exportTypes';
import { redactSecretsFromMarkdown } from './privacyScanner';
import { sanitizeFilename } from './filenameSanitizer';
import { revealClozeDeletions } from '../publishing';

/**
 * Transforms a single note into clean, portable or native Markdown.
 */
export function transformNoteToMarkdown(
  note: Note,
  config: ExportScopeConfig,
  format: ExportFormat,
  options: {
    folderMap: Map<string, string>;
    slugMap: Map<string, string>;
    allNotesMap: Map<string, Note>;
    currentNoteSlug?: string;
  }
): { markdown: string; relativeFilePath: string } {
  const { folderMap, slugMap, allNotesMap, currentNoteSlug } = options;
  const isNative = format === 'native-markdown';

  // 1. Process Frontmatter & Body
  const { frontmatter, body } = parseFrontmatter(note.content || '');
  let processedBody = body;

  // Reveal cloze deletions unless native mode
  if (!isNative) {
    processedBody = revealClozeDeletions(processedBody);
    processedBody = stripBlockIdsFromMarkdown(processedBody);
  }

  // Redact secrets if requested
  if (config.maskSensitiveData) {
    processedBody = redactSecretsFromMarkdown(processedBody);
  }

  // Strip private tags if configured
  if (config.hidePrivateTags && config.excludeTags && config.excludeTags.length > 0) {
    for (const tag of config.excludeTags) {
      const cleanTag = tag.replace(/^#/, '');
      const regex = new RegExp(`(?:^|\\s)#${cleanTag}\\b`, 'gi');
      processedBody = processedBody.replace(regex, '');
    }
  }

  // 2. Link Rewriting (Wikilinks [[Target|Alias]] -> [Alias](./Target.md))
  if (config.linkRewriteMode === 'relative-markdown' && !isNative) {
    processedBody = processedBody.replace(
      /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g,
      (match, rawTarget, headingAnchor, alias) => {
        const targetTitle = rawTarget.trim();
        const displayText = alias ? alias.trim() : (targetTitle || 'Link');

        // Look up target note
        let targetNote: Note | undefined;
        for (const n of allNotesMap.values()) {
          if ((n.title || '').trim().toLowerCase() === targetTitle.toLowerCase()) {
            targetNote = n;
            break;
          }
        }

        if (targetNote && slugMap.has(targetNote.id)) {
          const targetPath = slugMap.get(targetNote.id)!;
          // Calculate relative path from currentNoteSlug to targetPath
          let relHref = targetPath;
          if (currentNoteSlug && currentNoteSlug.includes('/')) {
            const currentDirDepth = currentNoteSlug.split('/').length - 1;
            const prefix = '../'.repeat(currentDirDepth);
            relHref = `${prefix}${targetPath}`;
          }

          if (headingAnchor) {
            const cleanHeading = slugify(headingAnchor.trim());
            relHref += `#${cleanHeading}`;
          }

          return `[${displayText}](${relHref})`;
        } else {
          // Out of scope or missing target: output plain text
          return displayText;
        }
      }
    );
  } else if (config.linkRewriteMode === 'plain-text' && !isNative) {
    processedBody = processedBody.replace(
      /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
      (match, target, heading, alias) => {
        return (alias || target || '').trim();
      }
    );
  }

  // 3. Format Checklist Items if type is checklist
  if (note.type === 'checklist' && note.checklist && note.checklist.length > 0) {
    const checklistMd = note.checklist
      .map((item) => `- [${item.completed ? 'x' : ' '}] ${item.text}`)
      .join('\n');

    if (processedBody.trim()) {
      processedBody = `${processedBody.trim()}\n\n${checklistMd}\n`;
    } else {
      processedBody = `${checklistMd}\n`;
    }
  }

  // 4. Construct YAML Frontmatter
  const fmLines: string[] = ['---'];

  if (isNative) {
    fmLines.push(`id: "${note.id}"`);
  }

  const escapedTitle = (note.title || 'Untitled').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  fmLines.push(`title: "${escapedTitle}"`);
  fmLines.push(`created: "${note.createdAt}"`);
  fmLines.push(`updated: "${note.updatedAt}"`);

  const folderName = note.folderId ? folderMap.get(note.folderId) : undefined;
  if (folderName) {
    fmLines.push(`folder: "${folderName.replace(/"/g, '\\"')}"`);
  }

  // Filter tags
  let tags = note.tags || [];
  if (config.hidePrivateTags && config.excludeTags) {
    const excludeSet = new Set(config.excludeTags.map((t) => t.replace(/^#/, '').toLowerCase()));
    tags = tags.filter((t) => !excludeSet.has(t.toLowerCase()));
  }
  if (tags.length > 0) {
    fmLines.push(`tags: [${tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ')}]`);
  }

  // Allowlisted properties
  if (config.propertyAllowlist && config.propertyAllowlist.length > 0 && frontmatter) {
    for (const key of config.propertyAllowlist) {
      if ((frontmatter as any)[key] !== undefined) {
        const val = (frontmatter as any)[key];
        fmLines.push(`${key}: ${JSON.stringify(val)}`);
      }
    }
  }

  if (isNative) {
    if (note.pinned) fmLines.push('pinned: true');
    if (note.archived) fmLines.push('archived: true');
    if (note.color && note.color !== 'default') fmLines.push(`color: "${note.color}"`);
  }

  fmLines.push('---\n');

  const fullMarkdown = fmLines.join('\n') + '\n' + processedBody.trim() + '\n';
  const relativeFilePath = slugMap.get(note.id) || `notes/${sanitizeFilename(note.title || 'Untitled')}.md`;

  return {
    markdown: fullMarkdown,
    relativeFilePath,
  };
}
