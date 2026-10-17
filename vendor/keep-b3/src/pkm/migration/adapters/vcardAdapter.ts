/**
 * P48 — vCard Migration Adapter
 * High fidelity importer for RFC 6350 .vcf / .vcard files into canonical Markdown Person notes.
 */

import { AdapterParseResult, MigrationAdapter } from './baseAdapter';
import {
  AttachmentCandidate,
  FolderCandidate,
  MigrationPlan,
  MigrationProgress,
  MigrationWarning,
  NoteCandidate,
  RawImportFile,
} from '../migrationTypes';
import { parseVCardText } from '../../people/vcardParser';
import { peopleService } from '../../people/peopleService';
import { computeContentHash } from '../securitySanitizer';

export class VCardMigrationAdapter implements MigrationAdapter {
  id = 'vcard' as const;
  displayName = 'vCard Contacts (.vcf)';
  description = 'Imports standard address book contacts (.vcf / .vcard) into canonical Markdown Person notes with YAML frontmatter.';

  async parse(
    files: RawImportFile[],
    plan: MigrationPlan,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<AdapterParseResult> {
    const notes: NoteCandidate[] = [];
    const attachments: AttachmentCandidate[] = [];
    const foldersMap = new Map<string, FolderCandidate>();
    const warnings: MigrationWarning[] = [];

    const vcfFiles = files.filter(
      (f) =>
        f.name.toLowerCase().endsWith('.vcf') ||
        f.name.toLowerCase().endsWith('.vcard') ||
        f.path.toLowerCase().endsWith('.vcf') ||
        f.path.toLowerCase().endsWith('.vcard')
    );

    let processed = 0;
    const total = vcfFiles.length;

    for (const file of vcfFiles) {
      processed++;
      if (onProgress) {
        onProgress({
          stage: 'converting',
          progressPercentage: Math.round((processed / total) * 100),
          currentMessage: `Parsing ${file.name} (${processed}/${total})`,
          processedItems: processed,
          totalItems: total,
        });
      }

      const text = await file.readAsText();
      const { contacts, warnings: parserWarnings } = parseVCardText(text);

      parserWarnings.forEach((w, i) => {
        warnings.push({
          id: `vcf_warn_${file.name}_${i}`,
          severity: 'info',
          category: 'unsupported-syntax',
          message: w,
          sourcePath: file.path,
        });
      });

      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        const generated = peopleService.generatePersonNoteContent({
          displayName: c.fn,
          givenName: c.n?.given,
          familyName: c.n?.family,
          email: c.emails[0]?.address,
          phone: c.phones[0]?.number,
          organization: c.org,
          role: c.title,
          birthday: c.bday,
          website: c.urls[0],
          location: c.addresses[0]?.formatted,
          bodyNotes: c.note,
        });

        const hash = await computeContentHash(`${file.path}_${c.fn}_${i}`);
        const noteId = `vcf_note_${hash.slice(0, 12)}`;

        notes.push({
          id: noteId,
          sourcePath: file.path,
          title: generated.title,
          rawMarkdown: generated.content,
          folderPath: 'People',
          frontmatter: {
            tags: generated.tags,
            type: 'person',
            role: c.title,
            organization: c.org ? `[[${c.org}]]` : undefined,
            email: c.emails[0]?.address,
            phone: c.phones[0]?.number,
            birthday: c.bday,
          },
          tags: generated.tags,
          aliases: [],
          links: c.org
            ? [
                {
                  target: c.org,
                  isWikilink: true,
                  isEmbed: false,
                },
              ]
            : [],
          attachments: [],
          provenance: {
            sourceType: 'vcard',
            originalPath: `${file.path}#${i + 1}`,
            importTimestamp: Date.now(),
            sourceHash: hash,
          },
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
