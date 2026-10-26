/**
 * Smart Note Service - 100% Local, Offline Heuristic Engine
 * 
 * Provides intelligent text analysis, tag extraction, extractive summarization,
 * task detection, and vault link recommendations purely on the client side
 * with zero external API calls or AI model dependencies.
 */

export interface ExtractedTask {
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface SummaryResult {
  summary: string;
  keyTakeaways: string[];
}

export interface SmartTriageResult {
  suggestedFolder?: string;
  suggestedTags: string[];
  priority?: 'low' | 'medium' | 'high';
  isActionable: boolean;
  readingTimeMinutes: number;
  wordCount: number;
}

export interface WikiLinkSuggestion {
  noteId: string;
  title: string;
  matchContext: string;
}

// Stop words to filter out common grammatical noise
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'are', 'was', 'were', 'been', 'being', 'has', 'had', 'having', 'does',
  'did', 'doing', 'should', 'here', 'such', 'very', 'each', 'much', 'both', 'between'
]);

class SmartNoteService {
  /**
   * Extract meaningful semantic tags from note content using TF (Term Frequency)
   * and structural header weighting.
   */
  public extractTags(title: string, content: string, existingTags: string[] = []): string[] {
    const text = `${title} ${content}`.toLowerCase();
    
    // 1. Direct hashtags in text (e.g. #productivity, #roadmap)
    const hashtagMatches = text.match(/#([a-zA-Z0-9_-]{2,30})/g) || [];
    const directHashtags = hashtagMatches.map(h => h.replace('#', '').toLowerCase());

    // 2. Tokenize words (alphanumeric 3+ chars)
    const words = text.match(/[a-zA-Z0-9_-]{3,24}/g) || [];
    const frequencyMap = new Map<string, number>();

    // Heavy weight for title words
    const titleWords = title.toLowerCase().match(/[a-zA-Z0-9_-]{3,24}/g) || [];
    for (const word of titleWords) {
      if (!STOP_WORDS.has(word) && !/^\d+$/.test(word)) {
        frequencyMap.set(word, (frequencyMap.get(word) || 0) + 5);
      }
    }

    // Markdown Header weighting (# Header, ## Subheader)
    const headerLines = content.match(/^#{1,4}\s+(.+)$/gm) || [];
    for (const hLine of headerLines) {
      const hWords = hLine.replace(/^#{1,4}\s+/, '').toLowerCase().match(/[a-zA-Z0-9_-]{3,24}/g) || [];
      for (const hw of hWords) {
        if (!STOP_WORDS.has(hw) && !/^\d+$/.test(hw)) {
          frequencyMap.set(hw, (frequencyMap.get(hw) || 0) + 3);
        }
      }
    }

    // Body words weighting
    for (const word of words) {
      if (!STOP_WORDS.has(word) && !/^\d+$/.test(word)) {
        frequencyMap.set(word, (frequencyMap.get(word) || 0) + 1);
      }
    }

    // Heuristic category triggers
    const suggestedCategories: string[] = [];
    if (/meeting|agenda|attendees|sync|minutes|standup/i.test(text)) suggestedCategories.push('meeting');
    if (/project|roadmap|milestone|deadline|deliverable|sprint/i.test(text)) suggestedCategories.push('project');
    if (/todo|task|action item|assignee|checklist|follow-up/i.test(text)) suggestedCategories.push('action-items');
    if (/design|ui|ux|mockup|wireframe|figma|typography|palette/i.test(text)) suggestedCategories.push('design');
    if (/code|api|backend|frontend|database|sql|function|typescript|bug|deploy/i.test(text)) suggestedCategories.push('engineering');
    if (/idea|concept|brainstorm|proposal|rfc|hypothesis/i.test(text)) suggestedCategories.push('idea');
    if (/book|reading|summary|chapter|quote|author|literature/i.test(text)) suggestedCategories.push('reading');
    if (/finance|budget|expense|invoice|revenue|cost|price/i.test(text)) suggestedCategories.push('finance');

    // Sort by frequency
    const sortedWords = Array.from(frequencyMap.entries())
      .filter(([term]) => term.length >= 4)
      .sort((a, b) => b[1] - a[1])
      .map(([term]) => term);

    const existingLower = new Set(existingTags.map(t => t.toLowerCase()));
    const candidates = [
      ...directHashtags,
      ...suggestedCategories,
      ...sortedWords
    ];

    const finalTags: string[] = [];
    for (const tag of candidates) {
      if (!existingLower.has(tag) && !finalTags.includes(tag)) {
        finalTags.push(tag);
        if (finalTags.length >= 6) break;
      }
    }

    return finalTags;
  }

  /**
   * Derive a clean, concise title from note content.
   */
  public generateTitle(content: string, currentTitle: string = ''): string {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return currentTitle || 'Untitled Note';

    // Check first heading (# Heading)
    const firstHeader = lines.find(l => /^#{1,3}\s+/.test(l));
    if (firstHeader) {
      return firstHeader.replace(/^#{1,3}\s+/, '').slice(0, 60);
    }

    // Take first non-empty line without markdown symbols
    const cleanFirstLine = lines[0].replace(/^[-*+>]\s+/, '').replace(/^\[[ xX]\]\s+/, '').trim();
    if (cleanFirstLine.length <= 60) {
      return cleanFirstLine;
    }

    // Truncate at sensible word boundary
    const truncated = cleanFirstLine.slice(0, 55);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  /**
   * Extract action items, tasks, and to-dos from markdown formatting and imperative phrasing.
   */
  public extractTasks(content: string): ExtractedTask[] {
    const tasks: ExtractedTask[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Standard markdown checklist items: - [ ] Task or - [x] Task
      const checkMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
      if (checkMatch) {
        tasks.push({
          text: checkMatch[2].trim(),
          completed: checkMatch[1].toLowerCase() === 'x',
          priority: /urgent|critical|priority|asap/i.test(checkMatch[2]) ? 'high' : 'medium'
        });
        continue;
      }

      // Keyword to-do lines: TODO:, Action:, Next:, Follow-up:, FIXME:
      const todoMatch = trimmed.match(/^(?:TODO|ACTION|NEXT|FIXME|TASK|FOLLOW-UP)[:\s-]+(.+)$/i);
      if (todoMatch) {
        tasks.push({
          text: todoMatch[1].trim(),
          completed: false,
          priority: /urgent|critical|high/i.test(todoMatch[1]) ? 'high' : 'medium'
        });
        continue;
      }

      // Action verb lines starting with imperative (e.g. "Schedule call with...", "Review pull request...")
      const imperativeMatch = trimmed.match(/^[-*•]?\s*(Schedule|Review|Update|Send|Draft|Implement|Deploy|Follow up on|Call|Email|Fix|Create|Organize|Verify|Test)\s+(.+)$/i);
      if (imperativeMatch && trimmed.length > 15 && trimmed.length < 120) {
        tasks.push({
          text: `${imperativeMatch[1]} ${imperativeMatch[2]}`.trim(),
          completed: false,
          priority: 'medium'
        });
      }
    }

    return tasks.slice(0, 10);
  }

  /**
   * Algorithmic Extractive Summarization
   * Scores sentences based on position, word rarity, title overlap, and formatting.
   */
  public generateSummary(title: string, content: string): SummaryResult {
    // Strip markdown formatting for cleaner sentence segmentation
    const cleanText = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // Simplify links
      .replace(/^#{1,6}\s+/gm, '') // Strip headings markers
      .replace(/^[-*+]\s+/gm, '') // Strip bullet points
      .trim();

    // Sentence splitting by punctuation followed by space or newline
    const rawSentences = cleanText
      .split(/(?<=[.?!])\s+(?=[A-Z0-9])|\n+/)
      .map(s => s.trim())
      .filter(s => s.length >= 25 && s.length <= 250);

    if (rawSentences.length === 0) {
      return {
        summary: cleanText.slice(0, 160) || 'No sufficient content to summarize.',
        keyTakeaways: [cleanText.slice(0, 100)].filter(Boolean)
      };
    }

    if (rawSentences.length <= 2) {
      return {
        summary: rawSentences.join(' '),
        keyTakeaways: rawSentences
      };
    }

    // Calculate word frequencies
    const words = cleanText.toLowerCase().match(/[a-zA-Z0-9]{3,}/g) || [];
    const freq: Record<string, number> = {};
    for (const w of words) {
      if (!STOP_WORDS.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }

    const titleTokens = new Set(title.toLowerCase().match(/[a-zA-Z0-9]{3,}/g) || []);

    // Score sentences
    const scoredSentences = rawSentences.map((sentence, index) => {
      let score = 0;
      const sTokens = sentence.toLowerCase().match(/[a-zA-Z0-9]{3,}/g) || [];
      
      // Frequency score
      for (const t of sTokens) {
        if (freq[t]) score += freq[t];
        if (titleTokens.has(t)) score += 5; // Heavily weight sentences that relate directly to the title
      }

      // Position bias: first sentences are often topic sentences
      if (index === 0) score *= 1.5;
      if (index === 1) score *= 1.2;

      // Normalization by sentence length (avoid bias towards overly long run-on sentences)
      const normalizedScore = score / Math.max(1, sTokens.length);

      return { sentence, score: normalizedScore, originalIndex: index };
    });

    // Pick top 2-3 highest scoring sentences
    const topScored = [...scoredSentences].sort((a, b) => b.score - a.score).slice(0, 3);
    
    // Sort them back into chronological reading order
    const ordered = topScored.sort((a, b) => a.originalIndex - b.originalIndex);
    const summary = ordered.map(item => item.sentence).join(' ');

    // Extract 2 to 4 bullet points as key takeaways
    const keyTakeaways = ordered.map(item => item.sentence);

    return {
      summary,
      keyTakeaways
    };
  }

  /**
   * Suggest bidirectional WikiLinks [[Note Title]] by searching vault note titles
   * and detecting if their titles or aliases are mentioned in current note text.
   */
  public suggestWikiLinks(
    content: string,
    currentNoteId: string | undefined,
    allNotes: Array<{ id: string; title: string }>
  ): WikiLinkSuggestion[] {
    if (!content || !allNotes || allNotes.length === 0) return [];

    const normalizedContent = content.toLowerCase();
    const suggestions: WikiLinkSuggestion[] = [];
    const alreadyLinked = new Set<string>();

    // Detect existing [[links]] in note
    const existingLinkMatches = content.match(/\[\[(.*?)\]\]/g) || [];
    for (const match of existingLinkMatches) {
      const linkText = match.replace(/\[\[|\]\]/g, '').split('|')[0].trim().toLowerCase();
      alreadyLinked.add(linkText);
    }

    for (const otherNote of allNotes) {
      if (otherNote.id === currentNoteId) continue;
      const rawTitle = otherNote.title.trim();
      if (!rawTitle || rawTitle.length < 3) continue;

      const lowerTitle = rawTitle.toLowerCase();
      if (alreadyLinked.has(lowerTitle)) continue;

      // Search for exact word boundary match
      const regex = new RegExp(`\\b${escapeRegExp(lowerTitle)}\\b`, 'i');
      const match = regex.exec(content);

      if (match && match.index !== undefined) {
        // Extract 30 chars before and after for preview context
        const start = Math.max(0, match.index - 25);
        const end = Math.min(content.length, match.index + lowerTitle.length + 25);
        const context = (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '');

        suggestions.push({
          noteId: otherNote.id,
          title: rawTitle,
          matchContext: context
        });

        if (suggestions.length >= 8) break;
      }
    }

    return suggestions;
  }

  /**
   * Smart Triage - Analyzes note structure and suggests actionable parameters
   */
  public triageNote(title: string, content: string, folders: Array<{ id: string; name: string }>): SmartTriageResult {
    const wordCount = (content.trim().match(/\S+/g) || []).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    const tasks = this.extractTasks(content);
    const hasPendingTasks = tasks.some(t => !t.completed);
    const hasUrgentKeywords = /urgent|critical|asap|deadline|blocker/i.test(`${title} ${content}`);

    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (hasUrgentKeywords) priority = 'high';
    else if (!hasPendingTasks && wordCount < 50) priority = 'low';

    // Folder heuristics
    let suggestedFolder: string | undefined;
    const textLower = `${title} ${content}`.toLowerCase();
    for (const f of folders) {
      const fNameLower = f.name.toLowerCase();
      if (textLower.includes(fNameLower)) {
        suggestedFolder = f.id;
        break;
      }
    }

    const suggestedTags = this.extractTags(title, content);

    return {
      suggestedFolder,
      suggestedTags,
      priority,
      isActionable: hasPendingTasks,
      readingTimeMinutes,
      wordCount
    };
  }

  /**
   * Text Enhancement & Formatting Utilities
   */
  public enhanceText(text: string, mode: 'outline' | 'clean' | 'tasks'): string {
    switch (mode) {
      case 'outline': {
        const headers = text.match(/^#{1,4}\s+(.+)$/gm) || [];
        if (headers.length === 0) return '*(No headers found to generate outline)*';
        return headers.map(h => {
          const level = (h.match(/^#+/) || ['#'])[0].length;
          const label = h.replace(/^#+\s+/, '');
          const indent = '  '.repeat(Math.max(0, level - 1));
          return `${indent}- [${label}](#${label.toLowerCase().replace(/[^\w]+/g, '-')})`;
        }).join('\n');
      }
      case 'clean': {
        // Strip trailing whitespaces, normalize multiple empty lines to max 2
        return text
          .split('\n')
          .map(l => l.trimEnd())
          .join('\n')
          .replace(/\n{3,}/g, '\n\n');
      }
      case 'tasks': {
        const extracted = this.extractTasks(text);
        if (extracted.length === 0) return '*(No tasks detected in note)*';
        return extracted.map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n');
      }
      default:
        return text;
    }
  }
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const smartNoteService = new SmartNoteService();
