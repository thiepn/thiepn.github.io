/**
 * Vault-wide Relation Index for Phase P43
 * 
 * Builds an incremental map of:
 * Target Note ID -> Incoming Relations (source note ID, property key, cardinality)
 * Powers derived inverse relations without dual-writing to YAML!
 */

import { Note } from '../../types';
import { parseFrontmatterAST } from '../properties/frontmatterEngine';
import { parseRelationReferences } from './relationEngine';

export interface IncomingRelationEntry {
  sourceNoteId: string;
  sourceNoteTitle: string;
  propertyKey: string;
}

export class RelationIndex {
  // Map of targetNoteId -> IncomingRelationEntry[]
  private incomingRelations: Map<string, IncomingRelationEntry[]> = new Map();
  // Map of sourceNoteId -> Map<propertyKey, targetNoteIds[]>
  private outgoingRelations: Map<string, Map<string, string[]>> = new Map();

  private isBuilt = false;

  /**
   * Builds or rebuilds index from notes
   */
  public rebuild(allNotes: Note[]): void {
    this.incomingRelations.clear();
    this.outgoingRelations.clear();

    const noteIdMap = new Map<string, Note>();
    const titleToIdMap = new Map<string, string>();

    for (const note of allNotes) {
      if (!note || note.trashed) continue;
      noteIdMap.set(note.id, note);
      titleToIdMap.set(note.title.trim().toLowerCase(), note.id);
    }

    for (const note of allNotes) {
      if (!note || note.trashed || !note.content) continue;

      const { ast } = parseFrontmatterAST(note.content);
      if (!ast.hasFrontmatter || ast.hasSyntaxError) continue;

      const outgoingForNote = new Map<string, string[]>();

      for (const [key, rawVal] of Object.entries(ast.properties)) {
        if (!key || rawVal === undefined || rawVal === null) continue;

        const refs = parseRelationReferences(rawVal);
        if (refs.length === 0) continue;

        const targetIds: string[] = [];

        for (const ref of refs) {
          // Check if ref is note ID
          let targetId = noteIdMap.has(ref) ? ref : undefined;
          if (!targetId) {
            targetId = titleToIdMap.get(ref.trim().toLowerCase());
          }

          if (targetId) {
            targetIds.push(targetId);

            // Add to incoming map
            let incoming = this.incomingRelations.get(targetId);
            if (!incoming) {
              incoming = [];
              this.incomingRelations.set(targetId, incoming);
            }

            // Prevent duplicate entries
            if (!incoming.some((e) => e.sourceNoteId === note.id && e.propertyKey === key)) {
              incoming.push({
                sourceNoteId: note.id,
                sourceNoteTitle: note.title,
                propertyKey: key,
              });
            }
          }
        }

        if (targetIds.length > 0) {
          outgoingForNote.set(key, targetIds);
        }
      }

      if (outgoingForNote.size > 0) {
        this.outgoingRelations.set(note.id, outgoingForNote);
      }
    }

    this.isBuilt = true;
  }

  /**
   * Returns incoming relations to a target note (filtered optionally by property key)
   */
  public getIncomingRelations(targetNoteId: string, propertyKeyFilter?: string): IncomingRelationEntry[] {
    const list = this.incomingRelations.get(targetNoteId) || [];
    if (!propertyKeyFilter) return list;
    return list.filter((e) => e.propertyKey.toLowerCase() === propertyKeyFilter.toLowerCase());
  }

  /**
   * Returns outgoing target note IDs from a source note's property
   */
  public getOutgoingTargets(sourceNoteId: string, propertyKey: string): string[] {
    const sourceMap = this.outgoingRelations.get(sourceNoteId);
    if (!sourceMap) return [];
    return sourceMap.get(propertyKey) || [];
  }

  /**
   * Clears in-memory caches (for vault lock)
   */
  public clear(): void {
    this.incomingRelations.clear();
    this.outgoingRelations.clear();
    this.isBuilt = false;
  }
}

export const relationIndex = new RelationIndex();
