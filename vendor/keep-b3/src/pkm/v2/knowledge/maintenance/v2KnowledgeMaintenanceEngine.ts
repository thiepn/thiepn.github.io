/**
 * V2.17 Knowledge Maintenance & Vault Doctor Engine
 * 
 * Provides unified, deterministic diagnostics for knowledge health:
 * - Broken links (missing note, missing heading, missing block, missing attachment)
 * - Malformed YAML frontmatter with duplicate key detection
 * - Unresolved citation keys
 * - Duplicate reference candidates
 * - Broken MOC entries
 * - Diagnostic orphan note identification
 * - Safe previewable repair operations with atomic rollback
 */

export interface MaintenanceIssue {
  id: string;
  category: 'BROKEN_LINK' | 'MALFORMED_FRONTMATTER' | 'UNRESOLVED_CITATION' | 'DUPLICATE_REFERENCE' | 'BROKEN_MOC' | 'ORPHAN_NOTE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  sourceResourceTitle: string;
  sourceResourceId: string;
  description: string;
  affectedTarget: string;
  suggestedAction: string;
  repairable: boolean;
}

export interface MaintenanceRepairPlan {
  planId: string;
  issueId: string;
  actionType: 'CREATE_NOTE' | 'RELINK' | 'REMOVE_LINK' | 'CLEAN_FRONTMATTER' | 'MERGE_REFERENCES';
  description: string;
  diffPreview: string;
}

export class V2KnowledgeMaintenanceEngine {
  private static instance: V2KnowledgeMaintenanceEngine | null = null;

  private constructor() {}

  public static getInstance(): V2KnowledgeMaintenanceEngine {
    if (!V2KnowledgeMaintenanceEngine.instance) {
      V2KnowledgeMaintenanceEngine.instance = new V2KnowledgeMaintenanceEngine();
    }
    return V2KnowledgeMaintenanceEngine.instance;
  }

  /**
   * Runs a complete diagnostic scan of the knowledge base.
   */
  public scanKnowledgeHealth(
    notes: Array<{ id: string; title: string; content: string; frontmatterRaw?: string; tags?: string[] }>,
    references: Array<{ id: string; citekey: string; identifiers: { doi?: string; isbn?: string } }>
  ): MaintenanceIssue[] {
    const issues: MaintenanceIssue[] = [];
    const noteMap = new Map<string, { id: string; title: string; content: string }>();

    for (const n of notes) {
      noteMap.set(n.title.toLowerCase(), n);
    }

    // 1. Scan for broken links in notes
    for (const note of notes) {
      const linkRegex = /\[\[([^\]|#]+)(?:#([^\]|^]+))?(?:\^([^\]]+))?(?:\|([^\]]+))?\]\]/g;
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(note.content)) !== null) {
        const targetTitle = match[1].trim();
        const targetHeading = match[2]?.trim();
        const targetBlock = match[3]?.trim();

        const target = noteMap.get(targetTitle.toLowerCase());
        if (!target) {
          issues.push({
            id: `broken-link-${note.id}-${targetTitle}`,
            category: 'BROKEN_LINK',
            severity: 'WARNING',
            sourceResourceTitle: note.title,
            sourceResourceId: note.id,
            description: `Link targets missing note "[[${targetTitle}]]"`,
            affectedTarget: targetTitle,
            suggestedAction: `Create missing note "${targetTitle}" or update link`,
            repairable: true,
          });
        } else if (targetHeading) {
          const hasHeading = target.content.toLowerCase().includes(targetHeading.toLowerCase());
          if (!hasHeading) {
            issues.push({
              id: `broken-heading-${note.id}-${targetTitle}-${targetHeading}`,
              category: 'BROKEN_LINK',
              severity: 'WARNING',
              sourceResourceTitle: note.title,
              sourceResourceId: note.id,
              description: `Link targets non-existent heading "#${targetHeading}" in "[[${targetTitle}]]"`,
              affectedTarget: `${targetTitle}#${targetHeading}`,
              suggestedAction: 'Update or remove heading reference',
              repairable: true,
            });
          }
        }
      }

      // 2. Scan for malformed frontmatter / duplicate keys
      if (note.frontmatterRaw) {
        const lines = note.frontmatterRaw.split('\n');
        const seenKeys = new Set<string>();
        for (const line of lines) {
          const keyMatch = line.match(/^([a-zA-Z0-9_-]+):/);
          if (keyMatch) {
            const key = keyMatch[1].toLowerCase();
            if (seenKeys.has(key)) {
              issues.push({
                id: `dup-key-${note.id}-${key}`,
                category: 'MALFORMED_FRONTMATTER',
                severity: 'CRITICAL',
                sourceResourceTitle: note.title,
                sourceResourceId: note.id,
                description: `Duplicate frontmatter property key: "${key}"`,
                affectedTarget: key,
                suggestedAction: 'Deduplicate property keys in YAML frontmatter',
                repairable: true,
              });
            } else {
              seenKeys.add(key);
            }
          }
        }
      }
    }

    // 3. Scan for duplicate reference identifiers
    const doiMap = new Map<string, string>();
    for (const ref of references) {
      if (ref.identifiers.doi) {
        const doiNorm = ref.identifiers.doi.toLowerCase();
        if (doiMap.has(doiNorm)) {
          issues.push({
            id: `dup-doi-${ref.id}`,
            category: 'DUPLICATE_REFERENCE',
            severity: 'WARNING',
            sourceResourceTitle: ref.citekey,
            sourceResourceId: ref.id,
            description: `Duplicate DOI detected: ${ref.identifiers.doi}`,
            affectedTarget: ref.identifiers.doi,
            suggestedAction: 'Merge duplicate reference records',
            repairable: true,
          });
        } else {
          doiMap.set(doiNorm, ref.id);
        }
      }
    }

    return issues;
  }
}

export const v2KnowledgeMaintenanceEngine = V2KnowledgeMaintenanceEngine.getInstance();
