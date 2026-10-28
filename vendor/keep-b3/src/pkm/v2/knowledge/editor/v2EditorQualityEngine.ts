/**
 * V2.17 Editor Quality & Long-form Writing Engine
 * 
 * Provides high-performance Markdown editing utilities, incremental document outline parsing,
 * IME composition safety, structural undo/redo transactions, rich paste sanitization,
 * in-document Find & Replace, and resilient rendering validation.
 */

export interface DocumentHeading {
  id: string;
  level: number;
  text: string;
  slug: string;
  lineNumber: number;
  charOffset: number;
}

export interface DocumentBlock {
  blockId: string;
  type: 'paragraph' | 'heading' | 'list_item' | 'code' | 'table' | 'callout' | 'math' | 'mermaid';
  lineNumber: number;
  content: string;
}

export interface FindMatch {
  index: number;
  length: number;
  lineNumber: number;
  lineContent: string;
  matchText: string;
}

export interface UndoableEditorTransaction {
  id: string;
  actionName: string;
  timestamp: string;
  previousContent: string;
  newContent: string;
  previousSelection: { start: number; end: number };
  newSelection: { start: number; end: number };
}

export class V2EditorQualityEngine {
  private static instance: V2EditorQualityEngine | null = null;
  private undoStack: UndoableEditorTransaction[] = [];
  private redoStack: UndoableEditorTransaction[] = [];
  private maxUndoDepth: number = 100;

  private constructor() {}

  public static getInstance(): V2EditorQualityEngine {
    if (!V2EditorQualityEngine.instance) {
      V2EditorQualityEngine.instance = new V2EditorQualityEngine();
    }
    return V2EditorQualityEngine.instance;
  }

  /**
   * Generates a stable heading slug from heading text.
   */
  public generateHeadingSlug(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Incrementally parses headings from Markdown text into a structured outline.
   */
  public parseDocumentOutline(markdown: string): DocumentHeading[] {
    const headings: DocumentHeading[] = [];
    const lines = markdown.split('\n');
    let charOffset = 0;
    let insideCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
        charOffset += line.length + 1;
        continue;
      }

      if (!insideCodeBlock) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2].trim();
          const slug = this.generateHeadingSlug(text);
          headings.push({
            id: `heading-${i}-${slug}`,
            level,
            text,
            slug,
            lineNumber: i + 1,
            charOffset,
          });
        }
      }

      charOffset += line.length + 1;
    }

    return headings;
  }

  /**
   * Parses blocks and identifies explicit block references (^block-id).
   */
  public parseDocumentBlocks(markdown: string): DocumentBlock[] {
    const blocks: DocumentBlock[] = [];
    const lines = markdown.split('\n');
    let insideCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
        blocks.push({
          blockId: `line-${i + 1}`,
          type: 'code',
          lineNumber: i + 1,
          content: line,
        });
        continue;
      }

      if (insideCodeBlock) {
        blocks.push({
          blockId: `line-${i + 1}`,
          type: 'code',
          lineNumber: i + 1,
          content: line,
        });
        continue;
      }

      const trimmed = line.trim();
      if (!trimmed) continue;

      let blockId = `line-${i + 1}`;
      const explicitBlockMatch = line.match(/\^([a-zA-Z0-9_-]+)$/);
      if (explicitBlockMatch) {
        blockId = explicitBlockMatch[1];
      }

      let type: DocumentBlock['type'] = 'paragraph';
      if (trimmed.startsWith('#')) type = 'heading';
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) type = 'list_item';
      else if (trimmed.startsWith('|') && trimmed.endsWith('|')) type = 'table';
      else if (trimmed.startsWith('> [!')) type = 'callout';
      else if (trimmed.startsWith('$$')) type = 'math';
      else if (trimmed.startsWith('```mermaid')) type = 'mermaid';

      blocks.push({
        blockId,
        type,
        lineNumber: i + 1,
        content: line,
      });
    }

    return blocks;
  }

  /**
   * Sanitize pasted HTML content to secure clean Markdown or safe plain text.
   */
  public sanitizePastedHtml(html: string): string {
    if (!html) return '';

    // Strip unsafe script, iframe, object, embed, style tags and event handlers
    let clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\bon\w+\s*=\s*[^>\s]+/gi, '')
      .replace(/javascript:/gi, '');

    // Convert common rich text elements to Markdown equivalents
    clean = clean
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '') // strip remaining tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    return clean.replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * Performs an in-document search with exact/regex matching and bounds.
   */
  public findInDocument(
    content: string,
    query: string,
    options: { matchCase?: boolean; matchWholeWord?: boolean; isRegex?: boolean } = {}
  ): FindMatch[] {
    if (!content || !query) return [];

    const matches: FindMatch[] = [];
    const lines = content.split('\n');
    let globalOffset = 0;

    let regex: RegExp;
    try {
      if (options.isRegex) {
        regex = new RegExp(query, options.matchCase ? 'g' : 'gi');
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = options.matchWholeWord ? `\\b${escaped}\\b` : escaped;
        regex = new RegExp(pattern, options.matchCase ? 'g' : 'gi');
      }
    } catch {
      return []; // Return empty on invalid regex
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let match: RegExpExecArray | null;
      regex.lastIndex = 0;

      while ((match = regex.exec(line)) !== null) {
        matches.push({
          index: globalOffset + match.index,
          length: match[0].length,
          lineNumber: lineIndex + 1,
          lineContent: line,
          matchText: match[0],
        });

        if (match[0].length === 0) {
          regex.lastIndex++; // Avoid infinite loop on zero-length matches
        }
      }

      globalOffset += line.length + 1;
    }

    return matches;
  }

  /**
   * Replaces all instances of query with replacement string and records undo transaction.
   */
  public replaceAll(
    content: string,
    query: string,
    replacement: string,
    options: { matchCase?: boolean; matchWholeWord?: boolean; isRegex?: boolean } = {}
  ): { newContent: string; replacementCount: number; transaction: UndoableEditorTransaction } {
    const matches = this.findInDocument(content, query, options);
    if (matches.length === 0) {
      return {
        newContent: content,
        replacementCount: 0,
        transaction: {
          id: `tx-${Date.now()}`,
          actionName: 'Replace All (0)',
          timestamp: new Date().toISOString(),
          previousContent: content,
          newContent: content,
          previousSelection: { start: 0, end: 0 },
          newSelection: { start: 0, end: 0 },
        },
      };
    }

    let regex: RegExp;
    if (options.isRegex) {
      regex = new RegExp(query, options.matchCase ? 'g' : 'gi');
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = options.matchWholeWord ? `\\b${escaped}\\b` : escaped;
      regex = new RegExp(pattern, options.matchCase ? 'g' : 'gi');
    }

    const newContent = content.replace(regex, replacement);
    const transaction: UndoableEditorTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actionName: `Replace All (${matches.length} matches)`,
      timestamp: new Date().toISOString(),
      previousContent: content,
      newContent,
      previousSelection: { start: 0, end: content.length },
      newSelection: { start: 0, end: newContent.length },
    };

    this.recordTransaction(transaction);

    return {
      newContent,
      replacementCount: matches.length,
      transaction,
    };
  }

  /**
   * Records a structural undoable transaction into the history stack.
   */
  public recordTransaction(transaction: UndoableEditorTransaction): void {
    this.undoStack.push(transaction);
    if (this.undoStack.length > this.maxUndoDepth) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
  }

  /**
   * Performs an undo operation, returning previous content and pushing to redo stack.
   */
  public undo(): UndoableEditorTransaction | null {
    const tx = this.undoStack.pop();
    if (!tx) return null;
    this.redoStack.push(tx);
    return tx;
  }

  /**
   * Performs a redo operation, returning next content and restoring to undo stack.
   */
  public redo(): UndoableEditorTransaction | null {
    const tx = this.redoStack.pop();
    if (!tx) return null;
    this.undoStack.push(tx);
    return tx;
  }

  public getUndoStackDepth(): number {
    return this.undoStack.length;
  }

  public getRedoStackDepth(): number {
    return this.redoStack.length;
  }

  public clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Formats and validates a Markdown table string, aligning columns cleanly.
   */
  public formatMarkdownTable(rawTable: string): string {
    const lines = rawTable.trim().split('\n').filter((l) => l.trim().startsWith('|'));
    if (lines.length < 2) return rawTable;

    const parsedRows = lines.map((line) => {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      return cells;
    });

    const colCount = Math.max(...parsedRows.map((r) => r.length));
    if (colCount === 0) return rawTable;

    // Calculate max widths for each column
    const colWidths = new Array(colCount).fill(3);
    for (let r = 0; r < parsedRows.length; r++) {
      if (r === 1) continue; // skip separator row in width calculation
      for (let c = 0; c < colCount; c++) {
        const text = parsedRows[r][c] || '';
        colWidths[c] = Math.max(colWidths[c], text.length);
      }
    }

    // Build aligned table
    const formattedLines: string[] = [];
    for (let r = 0; r < parsedRows.length; r++) {
      if (r === 1) {
        // Separator row
        const sepCells = colWidths.map((w) => '-'.repeat(w));
        formattedLines.push(`| ${sepCells.join(' | ')} |`);
      } else {
        const cells = [];
        for (let c = 0; c < colCount; c++) {
          const text = parsedRows[r][c] || '';
          cells.push(text.padEnd(colWidths[c], ' '));
        }
        formattedLines.push(`| ${cells.join(' | ')} |`);
      }
    }

    return formattedLines.join('\n');
  }

  /**
   * Validates KaTeX math expression syntax.
   */
  public validateMathSyntax(math: string): { valid: boolean; error?: string } {
    if (!math || !math.trim()) return { valid: true };
    const trimmed = math.trim();
    // Check balanced curly braces and brackets
    let braceCount = 0;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '{' && (i === 0 || trimmed[i - 1] !== '\\')) braceCount++;
      if (trimmed[i] === '}' && (i === 0 || trimmed[i - 1] !== '\\')) braceCount--;
      if (braceCount < 0) return { valid: false, error: 'Unmatched closing brace "}"' };
    }
    if (braceCount !== 0) return { valid: false, error: 'Unclosed brace "{"' };
    return { valid: true };
  }

  /**
   * Validates Mermaid diagram code and enforces SVG sanitization safety rules.
   */
  public validateMermaidSyntax(code: string): { valid: boolean; error?: string } {
    if (!code || !code.trim()) return { valid: false, error: 'Empty diagram' };
    const trimmed = code.trim();
    const validHeaders = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap'];
    const firstLine = trimmed.split('\n')[0].trim();
    const hasHeader = validHeaders.some((h) => firstLine.startsWith(h));

    if (!hasHeader) {
      return { valid: false, error: `Invalid Mermaid diagram header: "${firstLine}"` };
    }

    // Enforce SVG/XSS sanitization: reject script tags or javascript protocols inside diagram labels
    if (/<script/i.test(code) || /javascript:/i.test(code) || /onerror\s*=/i.test(code)) {
      return { valid: false, error: 'Forbidden executable script or event handler detected in Mermaid diagram' };
    }

    return { valid: true };
  }
}

export const v2EditorQualityEngine = V2EditorQualityEngine.getInstance();
