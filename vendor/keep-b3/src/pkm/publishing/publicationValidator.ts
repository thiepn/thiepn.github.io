/**
 * PKM Phase P39: Publication Privacy & Integrity Audit Engine
 * Performs comprehensive pre-build diagnostics to prevent accidental privacy leakage or broken structures.
 */

import { Note, Folder } from '../../types';
import { VaultIndex } from '../types';
import { vaultManager } from '../indexer';
import { vaultEncryptionService } from '../encryption';
import { parseFrontmatter } from '../parser';
import { resolveTransclusion } from '../transclusion';
import {
  Publication,
  PublicationDiagnosticIssue,
  PublicationValidationReport,
  ResolvedPublicationSnapshot,
} from './publishingTypes';
import { resolvePublicationSnapshot, extractTargetNoteIdsFromContent } from './publicationSourceResolver';

/**
 * Runs full pre-build privacy and validation audit on a publication
 */
export function auditPublication(
  publication: Publication,
  allNotes: Note[],
  folders: Folder[] = [],
  vaultIndex: VaultIndex = vaultManager.getIndex()
): PublicationValidationReport {
  const issues: PublicationDiagnosticIssue[] = [];
  const snapshot = resolvePublicationSnapshot(publication, allNotes, folders, vaultIndex);

  const isEncryptedVault = vaultEncryptionService.isVaultEncrypted();

  // 1. Check Empty Publication
  if (snapshot.primaryNotes.length === 0) {
    issues.push({
      id: 'issue_empty_pub',
      code: 'EMPTY_PUBLICATION',
      severity: 'error',
      title: 'No notes selected for publication',
      message: 'The current source filter yielded 0 published notes. Check your folder, tags, or draft exclusions.',
      autoFixable: false,
    });
  }

  // 2. Encrypted Vault Plaintext Warning
  if (isEncryptedVault) {
    issues.push({
      id: 'issue_encrypted_vault',
      code: 'ENCRYPTED_VAULT_PLAINTEXT_WARNING',
      severity: 'warning',
      title: 'Vault encryption is active',
      message: 'Exporting this publication will produce unencrypted plaintext HTML and Markdown files readable without your vault password.',
      autoFixable: false,
      suggestedAction: 'Ensure exported files are hosted securely or distributed only to intended recipients.',
    });
  }

  // 3. Check Home Note
  if (publication.homeNoteId && !snapshot.noteById.has(publication.homeNoteId)) {
    issues.push({
      id: 'issue_missing_home',
      code: 'MISSING_HOME_NOTE',
      severity: 'warning',
      title: 'Designated home note not found',
      message: 'The specified home note ID does not exist. An automatic index will be generated instead.',
      autoFixable: true,
      suggestedAction: 'Reset home note to first published note.',
    });
  }

  // 4. Audit Note-Level Risks (Links, Transclusions, Sensitive Metadata)
  const publishedTitleMap = new Map<string, Note>();
  snapshot.primaryNotes.forEach((n) => {
    if (n.title) publishedTitleMap.set(n.title.toLowerCase().trim(), n);
  });

  for (const note of snapshot.primaryNotes) {
    // Check Sensitive Daily Notes
    const isDaily =
      (note as any).isDailyNote === true ||
      /^\d{4}-\d{2}-\d{2}$/.test(note.title?.trim() || '');
    if (isDaily && !publication.source.excludeDailyNotes) {
      issues.push({
        id: `issue_daily_${note.id}`,
        code: 'SENSITIVE_DAILY_NOTE_INCLUDED',
        severity: 'info',
        title: 'Daily note included in public export',
        message: `"${note.title}" is a daily log note. Verify it contains no private reflections.`,
        noteId: note.id,
        noteTitle: note.title,
      });
    }

    // Check Template Notes
    if ((note as any).isTemplate === true) {
      issues.push({
        id: `issue_template_${note.id}`,
        code: 'TEMPLATE_NOTE_INCLUDED',
        severity: 'info',
        title: 'Template note included in export',
        message: `"${note.title}" appears to be a note template.`,
        noteId: note.id,
        noteTitle: note.title,
      });
    }

    // Check Unpublished Wikilink Targets
    const { forwardLinkIds, transclusionIds } = extractTargetNoteIdsFromContent(
      note.content || '',
      vaultIndex,
      allNotes
    );

    for (const targetId of forwardLinkIds) {
      if (!snapshot.allPublishedNoteIds.has(targetId)) {
        const targetNote = snapshot.noteById.get(targetId);
        issues.push({
          id: `issue_link_${note.id}_${targetId}`,
          code: 'UNPUBLISHED_INTERNAL_LINK',
          severity: 'warning',
          title: 'Link to unpublished note',
          message: `"${note.title}" links to "${targetNote?.title || targetId}", which is outside this publication. The link will render safely as unlinked text to prevent dead links.`,
          noteId: note.id,
          noteTitle: note.title,
          target: targetNote?.title || targetId,
          suggestedAction: 'Include the linked note in publication or remove link.',
        });
      }
    }

    // Check Transclusions for Cycles or Broken Targets
    const transMatches = (note.content || '').match(/!\[\[([^\]]+)\]\]/g) || [];
    for (const rawMatch of transMatches) {
      const rawTarget = rawMatch.replace(/^!\[\[|\]\]$/g, '').trim();
      if (!/\.(png|jpe?g|gif|webp|svg|mp3|wav|m4a|pdf)$/i.test(rawTarget)) {
        const res = resolveTransclusion(rawTarget, note.id, vaultIndex);
        if (res.status === 'circular_dependency') {
          issues.push({
            id: `issue_cycle_${note.id}_${rawTarget}`,
            code: 'TRANSCLUSION_CYCLE',
            severity: 'error',
            title: 'Circular transclusion embed loop',
            message: `"${note.title}" embeds "${rawTarget}" which forms an infinite recursive loop.`,
            noteId: note.id,
            noteTitle: note.title,
            target: rawTarget,
          });
        } else if (res.status === 'missing_note' || res.status === 'missing_heading') {
          issues.push({
            id: `issue_broken_trans_${note.id}_${rawTarget}`,
            code: 'BROKEN_TRANSCLUSION',
            severity: 'warning',
            title: 'Broken embedded note transclusion',
            message: `"${note.title}" contains embed ![[${rawTarget}]] which cannot be resolved.`,
            noteId: note.id,
            noteTitle: note.title,
            target: rawTarget,
          });
        }
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  const canBuild = publication.options.strictMode ? errorCount === 0 && warningCount === 0 : errorCount === 0;

  return {
    isValid: errorCount === 0,
    canBuild,
    issues,
    errorCount,
    warningCount,
    infoCount,
    resolvedNoteCount: snapshot.primaryNotes.length,
    dependentNoteCount: snapshot.embeddedNotes.length,
    isEncryptedVault,
  };
}
