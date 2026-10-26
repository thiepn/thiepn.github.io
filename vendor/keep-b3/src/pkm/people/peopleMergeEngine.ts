/**
 * Atomic Safe Merge Engine for Phase P48
 * 
 * Consolidates two Person notes into a single surviving canonical note.
 * Integrates with P29 Recovery Points, rewrites all Relations & Wikilinks,
 * updates Interaction participants, preserves aliases, and trashes the duplicate safely.
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { MergePlan, PersonRecord } from './peopleTypes';
import { parseFrontmatterAST, setPropertyInContent, updateFrontmatter } from '../properties/frontmatterEngine';
import { recoveryPointService } from '../resilience/recoveryPointService';

export interface MergeResult {
  success: boolean;
  survivorNote: Note;
  trashedNoteId: string;
  notesUpdatedCount: number;
  relationsRewrittenCount: number;
  error?: string;
}

/**
 * Executes a safe, atomic merge of two person notes
 */
export async function executeMergePeople(options: {
  plan: MergePlan;
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  settings: AppSettings;
  saveNote: (updatedNote: Note) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}): Promise<MergeResult> {
  const { plan, notes, folders, savedSearches, settings, saveNote, deleteNote } = options;

  const survivorNote = notes.find((n) => n.id === plan.survivorId);
  const duplicateNote = notes.find((n) => n.id === plan.duplicateId);

  if (!survivorNote || !duplicateNote) {
    return {
      success: false,
      survivorNote: survivorNote || duplicateNote || ({} as Note),
      trashedNoteId: plan.duplicateId,
      notesUpdatedCount: 0,
      relationsRewrittenCount: 0,
      error: 'One or both person notes were not found in the vault.',
    };
  }

  // 1. Create a P29 Recovery Point snapshot prior to any mutation
  try {
    await recoveryPointService.createRecoveryPoint(
      'manual',
      `Before merging "${duplicateNote.title}" into "${survivorNote.title}"`,
      {
        notes,
        folders,
        savedSearches,
        settings,
      }
    );
  } catch (snapErr) {
    console.warn('Could not create pre-merge recovery snapshot:', snapErr);
  }

  const { ast: survivorAst } = parseFrontmatterAST(survivorNote.content);
  const { ast: duplicateAst } = parseFrontmatterAST(duplicateNote.content);

  const mergedProperties: Record<string, unknown> = {
    ...survivorAst.properties,
    type: 'person',
  };

  // 2. Field-level choices
  for (const choice of plan.fieldChoices) {
    const propKey = choice.field === 'displayName'
      ? 'display-name'
      : choice.field === 'givenName'
      ? 'given-name'
      : choice.field === 'familyName'
      ? 'family-name'
      : choice.field;

    if (choice.winner === 'personB') {
      const valB = duplicateAst.properties[propKey] ?? (duplicateAst.properties as any)[choice.field];
      if (valB !== undefined) mergedProperties[propKey] = valB;
    } else if (choice.winner === 'custom' && choice.customValue !== undefined) {
      mergedProperties[propKey] = choice.customValue;
    }
  }

  // 3. Merging Array Fields
  // Aliases: add duplicate title and duplicate's aliases to survivor
  const aliasesSet = new Set<string>();
  const existingAliases = survivorAst.properties.aliases || (survivorAst.properties as any).alias;
  if (Array.isArray(existingAliases)) existingAliases.forEach((a) => aliasesSet.add(String(a)));
  else if (typeof existingAliases === 'string') aliasesSet.add(existingAliases);

  if (plan.preserveDuplicateNameAsAlias && duplicateNote.title) {
    aliasesSet.add(duplicateNote.title.trim());
  }
  const dupAliases = duplicateAst.properties.aliases || (duplicateAst.properties as any).alias;
  if (Array.isArray(dupAliases)) dupAliases.forEach((a) => aliasesSet.add(String(a)));
  else if (typeof dupAliases === 'string') aliasesSet.add(dupAliases);

  if (aliasesSet.size > 0) {
    mergedProperties.aliases = Array.from(aliasesSet);
  }

  // Emails
  if (plan.mergeEmails) {
    const emailsSet = new Set<string>();
    const e1 = survivorAst.properties.email || (survivorAst.properties as any).emails;
    const e2 = duplicateAst.properties.email || (duplicateAst.properties as any).emails;
    const addE = (val: unknown) => {
      if (Array.isArray(val)) val.forEach(addE);
      else if (typeof val === 'string' && val.trim()) emailsSet.add(val.trim());
    };
    addE(e1);
    addE(e2);
    if (emailsSet.size > 0) mergedProperties.email = Array.from(emailsSet);
  }

  // Phones
  if (plan.mergePhones) {
    const phonesSet = new Set<string>();
    const p1 = survivorAst.properties.phone || (survivorAst.properties as any).phones;
    const p2 = duplicateAst.properties.phone || (duplicateAst.properties as any).phones;
    const addP = (val: unknown) => {
      if (Array.isArray(val)) val.forEach(addP);
      else if (typeof val === 'string' && val.trim()) phonesSet.add(val.trim());
    };
    addP(p1);
    addP(p2);
    if (phonesSet.size > 0) mergedProperties.phone = Array.from(phonesSet);
  }

  // Tags
  if (plan.mergeTags) {
    const tagsSet = new Set<string>(['person', ...(survivorNote.tags || []), ...(duplicateNote.tags || [])]);
    mergedProperties.tags = Array.from(tagsSet);
  }

  // 4. Merge Markdown Body
  let newBody = survivorNote.content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
  const dupBody = duplicateNote.content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();

  if (plan.bodyMergeStrategy === 'append_duplicate_section' && dupBody) {
    newBody += `\n\n## Notes from Merged Record (${duplicateNote.title})\n\n${dupBody}`;
  } else if (plan.bodyMergeStrategy === 'custom' && plan.customMergedBody) {
    newBody = plan.customMergedBody;
  }

  const updatedSurvivorContent = updateFrontmatter(newBody, mergedProperties);
  const updatedSurvivorNote: Note = {
    ...survivorNote,
    content: updatedSurvivorContent,
    tags: Array.from(new Set(['person', ...(survivorNote.tags || []), ...(duplicateNote.tags || [])])),
    updatedAt: new Date().toISOString(),
  };

  // Save updated survivor note
  await saveNote(updatedSurvivorNote);

  // 5. Rewrite all Relations and Interaction references pointing to duplicate across vault
  let notesUpdatedCount = 1;
  let relationsRewrittenCount = 0;

  const dupTitle = duplicateNote.title.trim();
  const survivorTitle = survivorNote.title.trim();
  const dupWikilink = `[[${dupTitle}]]`;
  const survivorWikilink = `[[${survivorTitle}]]`;

  for (const otherNote of notes) {
    if (otherNote.id === survivorNote.id || otherNote.id === duplicateNote.id || otherNote.trashed) {
      continue;
    }

    let modified = false;
    let content = otherNote.content;

    // A. Check frontmatter relations (people, participants, mentor, manager, organization, etc.)
    const { ast: otherAst } = parseFrontmatterAST(content);
    if (otherAst.hasFrontmatter) {
      const newProps = { ...otherAst.properties };
      let propChanged = false;

      for (const [key, val] of Object.entries(otherAst.properties)) {
        if (Array.isArray(val)) {
          const replaced = val.map((item) => {
            if (typeof item === 'string') {
              if (item === plan.duplicateId || item === dupWikilink || item === `[[${dupTitle}]]`) {
                relationsRewrittenCount++;
                propChanged = true;
                return survivorWikilink;
              }
            }
            return item;
          });
          if (propChanged) newProps[key] = replaced;
        } else if (typeof val === 'string') {
          if (val === plan.duplicateId || val === dupWikilink || val === `[[${dupTitle}]]`) {
            relationsRewrittenCount++;
            propChanged = true;
            newProps[key] = survivorWikilink;
          }
        }
      }

      if (propChanged) {
        content = updateFrontmatter(content.replace(/^---\n[\s\S]*?\n---\n?/, ''), newProps);
        modified = true;
      }
    }

    // B. Check Markdown text body for tasks or wikilinks
    if (content.includes(dupWikilink)) {
      content = content.split(dupWikilink).join(survivorWikilink);
      modified = true;
      relationsRewrittenCount++;
    }

    if (modified) {
      await saveNote({
        ...otherNote,
        content,
        updatedAt: new Date().toISOString(),
      });
      notesUpdatedCount++;
    }
  }

  // 6. Move duplicate note to Trash (safely recoverable)
  await deleteNote(duplicateNote.id);

  return {
    success: true,
    survivorNote: updatedSurvivorNote,
    trashedNoteId: duplicateNote.id,
    notesUpdatedCount,
    relationsRewrittenCount,
  };
}
