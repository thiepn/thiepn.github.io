/**
 * V2.17 Link, Backlink & Knowledge Connection Engine
 * 
 * Provides deterministic Wikilink resolution, fast autocomplete ranking,
 * high-degree backlink indexing with surrounding context, conservative unlinked reference
 * matching, and safe broken link diagnostics and repair.
 */

export interface ParsedWikilink {
  raw: string;
  targetTitle: string;
  targetHeading?: string;
  targetBlockId?: string;
  alias?: string;
  charOffset: number;
}

export interface AutocompleteCandidate {
  resourceId: string;
  title: string;
  alias?: string;
  score: number;
  matchType: 'EXACT' | 'ALIAS' | 'PREFIX' | 'CONTEXT' | 'FUZZY';
  contextTag?: string;
}

export interface BacklinkEntry {
  sourceId: string;
  sourceTitle: string;
  category: 'LINKED_MENTION' | 'TRANSCLUDED_EMBED' | 'TYPED_RELATION';
  relationType?: string;
  surroundingContext: string;
  targetHeading?: string;
  targetBlockId?: string;
  lineNumber: number;
}

export interface UnlinkedReferenceMatch {
  sourceId: string;
  sourceTitle: string;
  matchedText: string;
  targetId: string;
  targetTitle: string;
  lineNumber: number;
  surroundingSentence: string;
  isIgnored?: boolean;
}

export interface BrokenLinkDiagnostic {
  id: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
  rawLink: string;
  type: 'MISSING_RESOURCE' | 'MISSING_HEADING' | 'MISSING_BLOCK' | 'MISSING_ATTACHMENT';
  targetTitle: string;
  targetSubRef?: string;
  suggestedAction: 'CREATE_MISSING_NOTE' | 'RELINK' | 'REMOVE_LINK';
}

export class V2LinkAndBacklinkEngine {
  private static instance: V2LinkAndBacklinkEngine | null = null;
  private ignoredUnlinkedMatches: Set<string> = new Set();
  private stopWordList: Set<string> = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'it', 'be',
    'home', 'work', 'time', 'note', 'notes', 'task', 'tasks', 'page', 'pages', 'day', 'days',
    'todo', 'test', 'new', 'item', 'general', 'main', 'project', 'log', 'daily'
  ]);

  private constructor() {}

  public static getInstance(): V2LinkAndBacklinkEngine {
    if (!V2LinkAndBacklinkEngine.instance) {
      V2LinkAndBacklinkEngine.instance = new V2LinkAndBacklinkEngine();
    }
    return V2LinkAndBacklinkEngine.instance;
  }

  /**
   * Parses all Wikilinks in a Markdown document.
   */
  public parseWikilinks(content: string): ParsedWikilink[] {
    const links: ParsedWikilink[] = [];
    const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const raw = match[0];
      const targetExpression = match[1].trim();
      const alias = match[2]?.trim();

      let targetTitle = targetExpression;
      let targetHeading: string | undefined;
      let targetBlockId: string | undefined;

      if (targetExpression.includes('#^')) {
        const parts = targetExpression.split('#^');
        targetTitle = parts[0].trim();
        targetBlockId = parts[1].trim();
      } else if (targetExpression.includes('#')) {
        const parts = targetExpression.split('#');
        targetTitle = parts[0].trim();
        targetHeading = parts[1].trim();
      }

      links.push({
        raw,
        targetTitle,
        targetHeading,
        targetBlockId,
        alias,
        charOffset: match.index,
      });
    }

    return links;
  }

  /**
   * Deterministic autocomplete ranking for Wikilinks:
   * 1. Exact title match (Score: 100)
   * 2. Exact alias match (Score: 90)
   * 3. Prefix title match (Score: 80)
   * 4. Current Context match (Score: 70)
   * 5. Fuzzy match (Score: 50)
   */
  public rankAutocompleteCandidates(
    query: string,
    vaultNotes: Array<{ id: string; title: string; aliases?: string[]; contextTags?: string[] }>,
    currentContextTag?: string
  ): AutocompleteCandidate[] {
    if (!query || !query.trim()) {
      return vaultNotes.slice(0, 20).map((n) => ({
        resourceId: n.id,
        title: n.title,
        score: 10,
        matchType: 'PREFIX',
      }));
    }

    const cleanQuery = query.trim().toLowerCase();
    const candidates: AutocompleteCandidate[] = [];

    for (const note of vaultNotes) {
      const titleLower = note.title.toLowerCase();

      // 1. Exact title
      if (titleLower === cleanQuery) {
        candidates.push({
          resourceId: note.id,
          title: note.title,
          score: 100,
          matchType: 'EXACT',
        });
        continue;
      }

      // 2. Exact alias
      if (note.aliases && note.aliases.some((a) => a.toLowerCase() === cleanQuery)) {
        const matchedAlias = note.aliases.find((a) => a.toLowerCase() === cleanQuery);
        candidates.push({
          resourceId: note.id,
          title: note.title,
          alias: matchedAlias,
          score: 90,
          matchType: 'ALIAS',
        });
        continue;
      }

      // 2b. Alias prefix or substring
      if (note.aliases && note.aliases.some((a) => a.toLowerCase().startsWith(cleanQuery) || a.toLowerCase().includes(cleanQuery))) {
        const matchedAlias = note.aliases.find((a) => a.toLowerCase().startsWith(cleanQuery) || a.toLowerCase().includes(cleanQuery));
        candidates.push({
          resourceId: note.id,
          title: note.title,
          alias: matchedAlias,
          score: 85,
          matchType: 'ALIAS',
        });
        continue;
      }

      // 3. Prefix title
      if (titleLower.startsWith(cleanQuery)) {
        candidates.push({
          resourceId: note.id,
          title: note.title,
          score: 80,
          matchType: 'PREFIX',
        });
        continue;
      }

      // 4. Contextual match
      if (
        currentContextTag &&
        note.contextTags &&
        note.contextTags.includes(currentContextTag) &&
        titleLower.includes(cleanQuery)
      ) {
        candidates.push({
          resourceId: note.id,
          title: note.title,
          score: 70,
          matchType: 'CONTEXT',
          contextTag: currentContextTag,
        });
        continue;
      }

      // 5. General Substring / Fuzzy
      if (titleLower.includes(cleanQuery)) {
        candidates.push({
          resourceId: note.id,
          title: note.title,
          score: 50,
          matchType: 'FUZZY',
        });
      }
    }

    return candidates.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }

  /**
   * Extracts backlinks targeting a specific note, categorized and enriched with surrounding context.
   */
  public extractBacklinksForNote(
    targetNoteTitle: string,
    targetNoteId: string,
    allNotes: Array<{ id: string; title: string; content: string; relations?: Array<{ type: string; targetId: string }> }>
  ): BacklinkEntry[] {
    const backlinks: BacklinkEntry[] = [];
    const normalizedTarget = targetNoteTitle.toLowerCase();

    for (const source of allNotes) {
      if (source.id === targetNoteId) continue; // skip self-mentions

      // Check explicit typed relations
      if (source.relations) {
        for (const rel of source.relations) {
          if (rel.targetId === targetNoteId) {
            backlinks.push({
              sourceId: source.id,
              sourceTitle: source.title,
              category: 'TYPED_RELATION',
              relationType: rel.type,
              surroundingContext: `Explicit Connection: [${rel.type}] -> ${targetNoteTitle}`,
              lineNumber: 1,
            });
          }
        }
      }

      // Check Wikilinks and transclusions in content
      const lines = source.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Transclusion embed: ![[Target]]
        if (line.includes(`![[${targetNoteTitle}`) || line.toLowerCase().includes(`![[${normalizedTarget}`)) {
          backlinks.push({
            sourceId: source.id,
            sourceTitle: source.title,
            category: 'TRANSCLUDED_EMBED',
            surroundingContext: line.trim(),
            lineNumber: i + 1,
          });
          continue;
        }

        // Standard wikilink: [[Target]]
        const parsed = this.parseWikilinks(line);
        for (const link of parsed) {
          if (link.targetTitle.toLowerCase() === normalizedTarget) {
            backlinks.push({
              sourceId: source.id,
              sourceTitle: source.title,
              category: 'LINKED_MENTION',
              surroundingContext: line.trim(),
              targetHeading: link.targetHeading,
              targetBlockId: link.targetBlockId,
              lineNumber: i + 1,
            });
          }
        }
      }
    }

    return backlinks;
  }

  /**
   * Conservative unlinked references scanner.
   * Matches candidate note titles in text, strictly filtering out short stop words and already linked items.
   */
  public findUnlinkedReferences(
    sourceNote: { id: string; title: string; content: string },
    vaultCandidates: Array<{ id: string; title: string; aliases?: string[] }>
  ): UnlinkedReferenceMatch[] {
    const matches: UnlinkedReferenceMatch[] = [];
    const lines = sourceNote.content.split('\n');
    const existingLinks = this.parseWikilinks(sourceNote.content).map((l) => l.targetTitle.toLowerCase());

    for (const candidate of vaultCandidates) {
      if (candidate.id === sourceNote.id) continue;
      if (this.stopWordList.has(candidate.title.toLowerCase()) || candidate.title.length < 3) {
        continue; // Guard against noisy short words
      }

      // If already linked in the document, skip unlinked suggestion
      if (existingLinks.includes(candidate.title.toLowerCase())) {
        continue;
      }

      const matchTerms = [candidate.title, ...(candidate.aliases || [])].filter(
        (term) => !this.stopWordList.has(term.toLowerCase()) && term.length >= 3
      );

      for (const term of matchTerms) {
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes(`[[${term}`) || line.includes(`[${term}]`)) continue; // Already inside a link

          let regMatch: RegExpExecArray | null;
          while ((regMatch = regex.exec(line)) !== null) {
            const ignoreKey = `${sourceNote.id}-${candidate.id}-${i + 1}`;
            if (this.ignoredUnlinkedMatches.has(ignoreKey)) continue;

            matches.push({
              sourceId: sourceNote.id,
              sourceTitle: sourceNote.title,
              matchedText: regMatch[0],
              targetId: candidate.id,
              targetTitle: candidate.title,
              lineNumber: i + 1,
              surroundingSentence: line.trim(),
              isIgnored: false,
            });
          }
        }
      }
    }

    return matches;
  }

  public ignoreUnlinkedMatch(sourceId: string, targetId: string, lineNumber: number): void {
    const key = `${sourceId}-${targetId}-${lineNumber}`;
    this.ignoredUnlinkedMatches.add(key);
  }

  /**
   * Scans vault for broken links (missing notes, missing headings, missing blocks).
   */
  public scanBrokenLinks(
    allNotes: Array<{ id: string; title: string; content: string }>
  ): BrokenLinkDiagnostic[] {
    const diagnostics: BrokenLinkDiagnostic[] = [];
    const titleMap = new Map<string, { id: string; title: string; content: string }>();

    for (const n of allNotes) {
      titleMap.set(n.title.toLowerCase(), n);
    }

    for (const note of allNotes) {
      const parsedLinks = this.parseWikilinks(note.content);

      for (const link of parsedLinks) {
        const target = titleMap.get(link.targetTitle.toLowerCase());

        if (!target) {
          diagnostics.push({
            id: `broken-${note.id}-${link.targetTitle}-${link.charOffset}`,
            sourceNoteId: note.id,
            sourceNoteTitle: note.title,
            rawLink: link.raw,
            type: 'MISSING_RESOURCE',
            targetTitle: link.targetTitle,
            suggestedAction: 'CREATE_MISSING_NOTE',
          });
          continue;
        }

        // If link points to a heading, verify heading exists
        if (link.targetHeading) {
          const headingSlug = link.targetHeading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          const hasHeading = target.content.split('\n').some((l) => {
            if (/^#{1,6}\s+/.test(l)) {
              const text = l.replace(/^#{1,6}\s+/, '').trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
              return text === headingSlug || l.toLowerCase().includes(link.targetHeading!.toLowerCase());
            }
            return false;
          });

          if (!hasHeading) {
            diagnostics.push({
              id: `broken-heading-${note.id}-${link.targetTitle}-${link.targetHeading}`,
              sourceNoteId: note.id,
              sourceNoteTitle: note.title,
              rawLink: link.raw,
              type: 'MISSING_HEADING',
              targetTitle: link.targetTitle,
              targetSubRef: link.targetHeading,
              suggestedAction: 'RELINK',
            });
          }
        }

        // If link points to a block ID, verify block exists
        if (link.targetBlockId) {
          const hasBlock = target.content.includes(`^${link.targetBlockId}`);
          if (!hasBlock) {
            diagnostics.push({
              id: `broken-block-${note.id}-${link.targetTitle}-${link.targetBlockId}`,
              sourceNoteId: note.id,
              sourceNoteTitle: note.title,
              rawLink: link.raw,
              type: 'MISSING_BLOCK',
              targetTitle: link.targetTitle,
              targetSubRef: link.targetBlockId,
              suggestedAction: 'RELINK',
            });
          }
        }
      }
    }

    return diagnostics;
  }
}

export const v2LinkAndBacklinkEngine = V2LinkAndBacklinkEngine.getInstance();
