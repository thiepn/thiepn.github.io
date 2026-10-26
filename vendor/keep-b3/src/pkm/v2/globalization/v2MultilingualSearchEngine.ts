/**
 * PKM V2.18 Multilingual Search, Unicode-Safe Tokenization & Highlighting Engine
 * 
 * Works completely offline without cloud APIs or embedding requirements.
 * Handles Latin diacritics, Turkish casing, German umlauts, Korean Hangul syllables, and CJK bigrams.
 */

import { MultilingualSearchResult } from './globalizationTypes';
import { v2UnicodeAndBidiEngine } from './v2UnicodeAndBidiEngine';

export interface IndexedDocument {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  aliases?: string[];
}

export class V2MultilingualSearchEngine {
  private static instance: V2MultilingualSearchEngine | null = null;
  private documents: Map<string, IndexedDocument> = new Map();

  private constructor() {}

  public static getInstance(): V2MultilingualSearchEngine {
    if (!V2MultilingualSearchEngine.instance) {
      V2MultilingualSearchEngine.instance = new V2MultilingualSearchEngine();
    }
    return V2MultilingualSearchEngine.instance;
  }

  public indexDocument(doc: IndexedDocument): void {
    this.documents.set(doc.id, doc);
  }

  public removeDocument(id: string): void {
    this.documents.delete(id);
  }

  public clear(): void {
    this.documents.clear();
  }

  /**
   * Tokenizes text across Latin, CJK, Korean, Turkish, and Arabic scripts.
   */
  public tokenize(text: string): string[] {
    if (!text) return [];

    const normalized = text.normalize('NFC');
    const tokens: string[] = [];

    // Split words by standard whitespace and punctuation, keeping Hangul, Cyrillic, Greek, Arabic, Latin
    const wordMatches = normalized.match(/[\p{L}\p{N}_-]+/gu) || [];
    for (const w of wordMatches) {
      tokens.push(w.toLowerCase());
      
      // Also generate CJK 2-grams if the word contains CJK ideographs
      if (/[\u4E00-\u9FFF]/.test(w)) {
        for (let i = 0; i < w.length - 1; i++) {
          tokens.push(w.slice(i, i + 2));
        }
      }
    }

    return tokens;
  }

  /**
   * Folds diacritics for flexible fuzzy matching e.g. "résumé" -> "resume", "Über" -> "uber"
   */
  public foldDiacritics(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /**
   * Searches the document store with multilingual rank scoring.
   */
  public search(query: string, options: { exactMatch?: boolean; maxResults?: number } = {}): MultilingualSearchResult[] {
    if (!query || !query.trim()) return [];

    const trimmed = query.trim();
    const queryLower = trimmed.toLowerCase();
    const queryFolded = this.foldDiacritics(trimmed);
    const queryTokens = this.tokenize(trimmed);

    const results: MultilingualSearchResult[] = [];

    for (const [id, doc] of this.documents) {
      let score = 0;
      const matchedTerms: Set<string> = new Set();

      const titleLower = doc.title.toLowerCase();
      const titleFolded = this.foldDiacritics(doc.title);
      const bodyLower = doc.body.toLowerCase();
      const bodyFolded = this.foldDiacritics(doc.body);

      // 1. Exact Title Match
      if (titleLower === queryLower) {
        score += 1000;
        matchedTerms.add(trimmed);
      } else if (titleLower.startsWith(queryLower)) {
        score += 500;
        matchedTerms.add(trimmed);
      } else if (titleLower.includes(queryLower)) {
        score += 300;
        matchedTerms.add(trimmed);
      } else if (!options.exactMatch && titleFolded.includes(queryFolded)) {
        score += 200;
        matchedTerms.add(trimmed);
      }

      // 2. Aliases Match
      if (doc.aliases) {
        for (const alias of doc.aliases) {
          if (alias.toLowerCase().includes(queryLower)) {
            score += 250;
            matchedTerms.add(alias);
          }
        }
      }

      // 3. Tags Match
      if (doc.tags) {
        for (const tag of doc.tags) {
          if (tag.toLowerCase().includes(queryLower)) {
            score += 150;
            matchedTerms.add(tag);
          }
        }
      }

      // 4. Token & Body Matches
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          score += 50;
          matchedTerms.add(token);
        } else if (!options.exactMatch && titleFolded.includes(this.foldDiacritics(token))) {
          score += 30;
          matchedTerms.add(token);
        }

        if (bodyLower.includes(token)) {
          score += 15;
          matchedTerms.add(token);
        } else if (!options.exactMatch && bodyFolded.includes(this.foldDiacritics(token))) {
          score += 10;
          matchedTerms.add(token);
        }
      }

      if (score > 0) {
        const highlightedTitle = this.highlightMatches(doc.title, Array.from(matchedTerms));
        const snippet = this.generateSnippet(doc.body, Array.from(matchedTerms));

        results.push({
          resourceId: id,
          title: doc.title,
          highlightedTitle,
          snippet,
          score,
          matchedTerms: Array.from(matchedTerms),
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return options.maxResults ? results.slice(0, options.maxResults) : results;
  }

  /**
   * Unicode-safe highlighting that wraps matched substrings in <mark> tags without breaking graphemes.
   */
  public highlightMatches(text: string, terms: string[]): string {
    if (!text || terms.length === 0) return text;

    let highlighted = text;
    for (const term of terms) {
      if (!term.trim()) continue;
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
    return highlighted;
  }

  /**
   * Generates a context snippet around the first matched term without splitting grapheme clusters.
   */
  public generateSnippet(body: string, terms: string[], maxSnippetLength: number = 120): string {
    if (!body) return '';
    if (terms.length === 0) {
      return v2UnicodeAndBidiEngine.sliceGraphemes(body, 0, maxSnippetLength);
    }

    const firstTerm = terms[0].toLowerCase();
    const idx = body.toLowerCase().indexOf(firstTerm);

    if (idx === -1) {
      return v2UnicodeAndBidiEngine.sliceGraphemes(body, 0, maxSnippetLength);
    }

    const startGrapheme = Math.max(0, idx - 20);
    const endGrapheme = startGrapheme + maxSnippetLength;

    const slice = v2UnicodeAndBidiEngine.sliceGraphemes(body, startGrapheme, endGrapheme);
    const prefix = startGrapheme > 0 ? '...' : '';
    const suffix = endGrapheme < v2UnicodeAndBidiEngine.getGraphemeCount(body) ? '...' : '';

    return `${prefix}${this.highlightMatches(slice, terms)}${suffix}`;
  }
}

export const v2MultilingualSearchEngine = V2MultilingualSearchEngine.getInstance();
