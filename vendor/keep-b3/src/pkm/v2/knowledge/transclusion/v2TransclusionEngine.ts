/**
 * V2.17 Transclusion & Embedded Content Engine
 * 
 * Manages cycle-safe recursive transclusions, bounded recursion depth,
 * distinct visual metadata, direct source navigation, and portable degradation.
 */

export interface TransclusionTarget {
  raw: string;
  sourceTitle: string;
  heading?: string;
  blockId?: string;
}

export interface TransclusionResolutionResult {
  renderedContent: string;
  sourceNoteId?: string;
  sourceTitle: string;
  isTranscluded: true;
  hasCycle: boolean;
  cycleChain?: string[];
  depth: number;
  subTarget?: string;
}

export class V2TransclusionEngine {
  private static instance: V2TransclusionEngine | null = null;
  private readonly maxRecursionDepth: number = 5;

  private constructor() {}

  public static getInstance(): V2TransclusionEngine {
    if (!V2TransclusionEngine.instance) {
      V2TransclusionEngine.instance = new V2TransclusionEngine();
    }
    return V2TransclusionEngine.instance;
  }

  /**
   * Parses transclusion patterns: ![[Note]], ![[Note#Heading]], ![[Note#^block]]
   */
  public parseTransclusions(content: string): TransclusionTarget[] {
    const targets: TransclusionTarget[] = [];
    const regex = /!\[\[([^\]]+)\]\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const raw = match[0];
      const expression = match[1].trim();

      let sourceTitle = expression;
      let heading: string | undefined;
      let blockId: string | undefined;

      if (expression.includes('#^')) {
        const parts = expression.split('#^');
        sourceTitle = parts[0].trim();
        blockId = parts[1].trim();
      } else if (expression.includes('#')) {
        const parts = expression.split('#');
        sourceTitle = parts[0].trim();
        heading = parts[1].trim();
      }

      targets.push({
        raw,
        sourceTitle,
        heading,
        blockId,
      });
    }

    return targets;
  }

  /**
   * Resolves a transclusion recursively with cycle detection and depth limiting.
   */
  public resolveTransclusion(
    target: TransclusionTarget,
    allNotes: Map<string, { id: string; title: string; content: string }>,
    visitedChain: string[] = [],
    currentDepth: number = 0
  ): TransclusionResolutionResult {
    const normalizedTitle = target.sourceTitle.toLowerCase();
    const sourceNote = allNotes.get(normalizedTitle);

    if (!sourceNote) {
      return {
        renderedContent: `> *[Missing Transclusion: Note "${target.sourceTitle}" not found]*`,
        sourceTitle: target.sourceTitle,
        isTranscluded: true,
        hasCycle: false,
        depth: currentDepth,
      };
    }

    // Cycle detection check
    if (visitedChain.includes(sourceNote.id)) {
      return {
        renderedContent: `> *[Transclusion Recursion Cycle Blocked: ${visitedChain.concat(sourceNote.id).join(' -> ')}]*`,
        sourceNoteId: sourceNote.id,
        sourceTitle: sourceNote.title,
        isTranscluded: true,
        hasCycle: true,
        cycleChain: [...visitedChain, sourceNote.id],
        depth: currentDepth,
      };
    }

    // Depth limit check
    if (currentDepth >= this.maxRecursionDepth) {
      return {
        renderedContent: `> *[Transclusion Max Depth (${this.maxRecursionDepth}) Reached: ${sourceNote.title}]*`,
        sourceNoteId: sourceNote.id,
        sourceTitle: sourceNote.title,
        isTranscluded: true,
        hasCycle: false,
        depth: currentDepth,
      };
    }

    // Extract targeted slice (Heading section, Block ID, or whole document)
    let extractedSlice = sourceNote.content;

    if (target.heading) {
      extractedSlice = this.extractHeadingSection(sourceNote.content, target.heading);
    } else if (target.blockId) {
      extractedSlice = this.extractBlockById(sourceNote.content, target.blockId);
    }

    // Recursively resolve any nested transclusions inside the extracted content
    const nestedTransclusions = this.parseTransclusions(extractedSlice);
    let resolvedNested = extractedSlice;

    if (nestedTransclusions.length > 0) {
      const nextChain = [...visitedChain, sourceNote.id];
      for (const nested of nestedTransclusions) {
        const nestedResult = this.resolveTransclusion(nested, allNotes, nextChain, currentDepth + 1);
        resolvedNested = resolvedNested.replace(nested.raw, nestedResult.renderedContent);
      }
    }

    return {
      renderedContent: resolvedNested,
      sourceNoteId: sourceNote.id,
      sourceTitle: sourceNote.title,
      isTranscluded: true,
      hasCycle: false,
      depth: currentDepth,
      subTarget: target.heading ? `#${target.heading}` : target.blockId ? `#^${target.blockId}` : undefined,
    };
  }

  private extractHeadingSection(content: string, heading: string): string {
    const lines = content.split('\n');
    const normalizedTarget = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    let capturing = false;
    let targetLevel = 0;
    const capturedLines: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

        if (capturing) {
          // Stop capturing if we hit another heading of equal or higher level
          if (level <= targetLevel) {
            break;
          }
        } else if (text === normalizedTarget || headingMatch[2].trim().toLowerCase() === heading.toLowerCase()) {
          capturing = true;
          targetLevel = level;
          continue; // skip the heading line itself or include based on preference
        }
      }

      if (capturing) {
        capturedLines.push(line);
      }
    }

    return capturedLines.length > 0 ? capturedLines.join('\n').trim() : `> *[Heading "${heading}" not found in source]*`;
  }

  private extractBlockById(content: string, blockId: string): string {
    const lines = content.split('\n');
    const targetTag = `^${blockId}`;

    for (const line of lines) {
      if (line.includes(targetTag)) {
        return line.replace(targetTag, '').trim();
      }
    }

    return `> *[Block "^${blockId}" not found in source]*`;
  }
}

export const v2TransclusionEngine = V2TransclusionEngine.getInstance();
