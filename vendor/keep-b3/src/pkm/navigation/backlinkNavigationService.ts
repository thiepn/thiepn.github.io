import { Note } from '../../types';
import {
  LinkedMention,
  NavUnlinkedMentionCandidate,
  BacklinkGroup,
  BacklinkSortOption,
  BrokenLinkItem,
} from './navigationTypes';
import { slugify } from '../parser';
import { PKMResolver } from '../resolver';
import { vaultManager } from '../indexer';

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on',
  'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we',
  'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make',
  'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
  'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only',
  'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
  'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
]);

export class BacklinkNavigationService {
  /**
   * Extract all explicit linked mentions targeting a specific note
   */
  public getLinkedMentions(targetNoteId: string, notes: Note[]): LinkedMention[] {
    const targetNote = notes.find((n) => n.id === targetNoteId);
    if (!targetNote) return [];

    const targetTitle = (targetNote.title || '').trim();
    const targetTitleLower = targetTitle.toLowerCase();
    const targetSlug = slugify(targetTitle);

    const mentions: LinkedMention[] = [];

    for (const sourceNote of notes) {
      if (sourceNote.trashed || sourceNote.id === targetNoteId) continue;

      const lines = (sourceNote.content || '').split('\n');

      const numUpdated =
        typeof sourceNote.updatedAt === 'string'
          ? new Date(sourceNote.updatedAt).getTime()
          : typeof sourceNote.updatedAt === 'number'
          ? sourceNote.updatedAt
          : Date.now();

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];

        // 1. Wikilinks [[Target]] or [[Target#Heading]] or [[Target|Alias]]
        const wikiRegex = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
        let match: RegExpExecArray | null;

        while ((match = wikiRegex.exec(line)) !== null) {
          const rawTarget = match[1].trim();
          const headingPart = match[2]?.trim();
          const targetLower = rawTarget.toLowerCase();

          const matchesTarget =
            rawTarget === `note:${targetNoteId}` ||
            rawTarget === targetNoteId ||
            targetLower === targetTitleLower ||
            slugify(rawTarget) === targetSlug;

          if (matchesTarget) {
            const excerpt = this.extractExcerpt(line, match.index, match[0].length);
            mentions.push({
              id: `mention-${sourceNote.id}-${lineIdx}-${match.index}`,
              sourceNoteId: sourceNote.id,
              sourceNoteTitle: sourceNote.title || 'Untitled Note',
              targetRaw: rawTarget,
              headingTarget: headingPart,
              surroundingExcerpt: excerpt,
              lineIndex: lineIdx,
              isExplicitWikilink: true,
              updatedAt: numUpdated,
            });
          }
        }

        // 2. Typed Relations in frontmatter/properties
        if (sourceNote.properties) {
          for (const [propKey, propVal] of Object.entries(sourceNote.properties)) {
            if (typeof propVal === 'string' && (propVal === targetNoteId || propVal.toLowerCase() === targetTitleLower)) {
              mentions.push({
                id: `rel-${sourceNote.id}-${propKey}`,
                sourceNoteId: sourceNote.id,
                sourceNoteTitle: sourceNote.title || 'Untitled Note',
                targetRaw: propVal,
                surroundingExcerpt: `Property Relation: ${propKey} -> ${propVal}`,
                lineIndex: 0,
                isExplicitWikilink: false,
                isRelationField: true,
                relationType: propKey,
                updatedAt: numUpdated,
              });
            }
          }
        }
      }
    }

    return mentions;
  }

  /**
   * Conservative unlinked mentions suggestion generator (excludes stop words, short strings, common noise)
   */
  public getUnlinkedMentions(
    targetNoteId: string,
    notes: Note[],
    maxCandidates: number = 20
  ): NavUnlinkedMentionCandidate[] {
    const targetNote = notes.find((n) => n.id === targetNoteId);
    if (!targetNote) return [];

    const targetTitle = (targetNote.title || '').trim();
    if (targetTitle.length < 3) return []; // Ignore single/two letter titles to prevent flood

    const lowerTarget = targetTitle.toLowerCase();
    if (STOP_WORDS.has(lowerTarget)) return []; // Hard negative: Stop words are strictly excluded

    const candidates: NavUnlinkedMentionCandidate[] = [];
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(targetTitle)}\\b`, 'gi');

    for (const sourceNote of notes) {
      if (sourceNote.trashed || sourceNote.id === targetNoteId) continue;

      const lines = (sourceNote.content || '').split('\n');

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];

        // Skip lines that already have explicit wikilinks to this target
        if (line.includes(`[[${targetTitle}`) || line.includes(`[[${lowerTarget}`)) {
          continue;
        }

        let match: RegExpExecArray | null;
        while ((match = wordBoundaryRegex.exec(line)) !== null) {
          // Check that match is not already inside markdown link syntax [text](url) or [[wikilink]]
          const before = line.slice(0, match.index);
          const after = line.slice(match.index + match[0].length);
          if (before.includes('[[') && !before.includes(']]')) continue;

          const excerpt = this.extractExcerpt(line, match.index, match[0].length);
          candidates.push({
            id: `unlinked-${sourceNote.id}-${lineIdx}-${match.index}`,
            sourceNoteId: sourceNote.id,
            sourceNoteTitle: sourceNote.title || 'Untitled Note',
            matchedText: match[0],
            canonicalTargetTitle: targetTitle,
            targetNoteId,
            surroundingExcerpt: excerpt,
            lineIndex: lineIdx,
            charIndex: match.index,
            confidence: 0.85,
          });

          if (candidates.length >= maxCandidates) return candidates;
        }
      }
    }

    return candidates;
  }

  /**
   * Group linked mentions by source note with sorting
   */
  public groupAndSortMentions(
    mentions: LinkedMention[],
    sortBy: BacklinkSortOption = 'modified'
  ): BacklinkGroup[] {
    const groupMap = new Map<string, BacklinkGroup>();

    for (const mention of mentions) {
      if (!groupMap.has(mention.sourceNoteId)) {
        groupMap.set(mention.sourceNoteId, {
          sourceNoteId: mention.sourceNoteId,
          sourceNoteTitle: mention.sourceNoteTitle,
          updatedAt: mention.updatedAt,
          mentions: [],
        });
      }
      groupMap.get(mention.sourceNoteId)!.mentions.push(mention);
    }

    const groups = Array.from(groupMap.values());

    groups.sort((a, b) => {
      if (sortBy === 'title') {
        return a.sourceNoteTitle.localeCompare(b.sourceNoteTitle);
      }
      if (sortBy === 'relevance') {
        return b.mentions.length - a.mentions.length;
      }
      // default 'modified'
      return b.updatedAt - a.updatedAt;
    });

    return groups;
  }

  /**
   * Extract Outgoing links from a note (Wikilinks, URLs, Block references, Citations)
   */
  public getOutgoingLinks(note: Note): Array<{
    type: 'note' | 'external_url' | 'block' | 'citation';
    target: string;
    displayText?: string;
    lineIndex: number;
  }> {
    const outgoing: Array<{
      type: 'note' | 'external_url' | 'block' | 'citation';
      target: string;
      displayText?: string;
      lineIndex: number;
    }> = [];

    const lines = (note.content || '').split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Wikilinks [[Target]]
      const wikiRegex = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
      let wMatch: RegExpExecArray | null;
      while ((wMatch = wikiRegex.exec(line)) !== null) {
        outgoing.push({
          type: 'note',
          target: wMatch[1].trim(),
          displayText: wMatch[3]?.trim() || wMatch[1].trim(),
          lineIndex: i,
        });
      }

      // 2. External Markdown Links [Text](https://...)
      const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
      let uMatch: RegExpExecArray | null;
      while ((uMatch = urlRegex.exec(line)) !== null) {
        outgoing.push({
          type: 'external_url',
          target: uMatch[2].trim(),
          displayText: uMatch[1].trim(),
          lineIndex: i,
        });
      }

      // 3. Citations [@citekey] or [@citekey, p. 37]
      const citeRegex = /\[@([a-zA-Z0-9_-]+)(?:,\s*[^\]]+)?\]/g;
      let cMatch: RegExpExecArray | null;
      while ((cMatch = citeRegex.exec(line)) !== null) {
        outgoing.push({
          type: 'citation',
          target: cMatch[1].trim(),
          displayText: `@${cMatch[1].trim()}`,
          lineIndex: i,
        });
      }
    }

    return outgoing;
  }

  /**
   * Audit vault for all Broken Links (Missing notes, Missing headings, Missing blocks)
   */
  public auditBrokenLinks(notes: Note[]): BrokenLinkItem[] {
    const brokenItems: BrokenLinkItem[] = [];
    const index = vaultManager.getIndex();

    for (const sourceNote of notes) {
      if (sourceNote.trashed) continue;
      const lines = (sourceNote.content || '').split('\n');

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const wikiRegex = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
        let match: RegExpExecArray | null;

        while ((match = wikiRegex.exec(line)) !== null) {
          const rawTarget = match[1].trim();
          const subpath = match[2]?.trim();
          const res = PKMResolver.resolveLink(rawTarget + (subpath ? `#${subpath}` : ''), index, {
            currentNoteId: sourceNote.id,
          });

          if (res.status === 'missing') {
            brokenItems.push({
              id: `broken-${sourceNote.id}-${lineIdx}-${match.index}`,
              sourceNoteId: sourceNote.id,
              sourceNoteTitle: sourceNote.title || 'Untitled Note',
              rawTarget,
              brokenType: 'missing_note',
              targetNoteTitle: rawTarget,
              lineIndex: lineIdx,
              contextExcerpt: this.extractExcerpt(line, match.index, match[0].length),
            });
          } else if (res.status === 'resolved' && res.subpathStatus === 'not_found') {
            const isBlock = subpath?.startsWith('^');
            brokenItems.push({
              id: `broken-subpath-${sourceNote.id}-${lineIdx}-${match.index}`,
              sourceNoteId: sourceNote.id,
              sourceNoteTitle: sourceNote.title || 'Untitled Note',
              rawTarget: match[0],
              brokenType: isBlock ? 'missing_block' : 'missing_heading',
              targetNoteId: res.resolvedNoteId,
              targetNoteTitle: res.resolvedNoteTitle,
              targetSubpath: subpath,
              lineIndex: lineIdx,
              contextExcerpt: this.extractExcerpt(line, match.index, match[0].length),
            });
          }
        }
      }
    }

    return brokenItems;
  }

  private extractExcerpt(line: string, charIdx: number, matchLength: number): string {
    const pad = 40;
    const start = Math.max(0, charIdx - pad);
    const end = Math.min(line.length, charIdx + matchLength + pad);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < line.length ? '...' : '';
    return `${prefix}${line.slice(start, end).trim()}${suffix}`;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const backlinkNavigationService = new BacklinkNavigationService();
