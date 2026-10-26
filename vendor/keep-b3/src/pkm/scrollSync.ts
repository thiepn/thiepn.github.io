/**
 * Semantic Anchor-based Synchronized Scrolling Controller for Split Screen Editor / Preview
 */

export interface LineAnchor {
  line: number;
  lineIndex?: number;
  type: 'heading' | 'block' | 'paragraph' | 'math' | 'code' | 'list';
  id?: string;
  level?: number;
}

/**
 * Finds surrounding line anchors for a given line number
 */
export function findSurroundingLineAnchors(
  anchors: LineAnchor[],
  targetLine: number
): { prev: LineAnchor | null; next: LineAnchor | null } {
  let prev: LineAnchor | null = null;
  let next: LineAnchor | null = null;

  for (const anchor of anchors) {
    const l = anchor.lineIndex ?? anchor.line;
    if (l <= targetLine) {
      prev = anchor;
    }
    if (l >= targetLine) {
      next = anchor;
      break;
    }
  }

  return { prev, next };
}

/**
 * Extracts line anchors from Markdown text for semantic alignment
 */
export function extractLineAnchors(markdown: string): LineAnchor[] {
  if (!markdown || typeof markdown !== 'string') return [{ line: 0, lineIndex: 0, type: 'paragraph' }];

  const lines = markdown.split('\n');
  const anchors: LineAnchor[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s/);
      const level = match ? match[1].length : 1;
      anchors.push({ line: i, lineIndex: i, type: 'heading', level });
    } else if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      anchors.push({ line: i, lineIndex: i, type: 'code' });
    } else if (trimmed.startsWith('$$')) {
      anchors.push({ line: i, lineIndex: i, type: 'math' });
    } else if (trimmed.startsWith('![')) {
      anchors.push({ line: i, lineIndex: i, type: 'block' });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      anchors.push({ line: i, lineIndex: i, type: 'list' });
    } else if (i === 0 || !lines[i - 1]?.trim()) {
      anchors.push({ line: i, lineIndex: i, type: 'paragraph' });
    }
  }

  if (anchors.length === 0) {
    anchors.push({ line: 0, lineIndex: 0, type: 'paragraph' });
  }

  // Ensure last line is anchored
  if (anchors[anchors.length - 1].line !== lines.length - 1) {
    const lastIdx = Math.max(0, lines.length - 1);
    anchors.push({ line: lastIdx, lineIndex: lastIdx, type: 'paragraph' });
  }

  return anchors;
}

export interface DOMAnchor {
  line: number;
  offsetTop: number;
}

/**
 * Collects rendered DOM elements with data-line attributes inside preview container
 */
export function collectDOMAnchors(previewContainer: HTMLElement): DOMAnchor[] {
  const elements = previewContainer.querySelectorAll('[data-line]');
  const anchors: DOMAnchor[] = [];

  elements.forEach((el) => {
    const rawLine = el.getAttribute('data-line');
    if (rawLine !== null) {
      const line = parseInt(rawLine, 10);
      if (!isNaN(line)) {
        const offsetTop = (el as HTMLElement).offsetTop;
        anchors.push({ line, offsetTop });
      }
    }
  });

  anchors.sort((a, b) => a.line - b.line);
  return anchors;
}

/**
 * Calculates Preview scrollTop from Editor scrollTop using line-based anchor interpolation
 */
export function calculatePreviewScrollFromEditor(
  editor: HTMLTextAreaElement,
  previewContainer: HTMLElement
): number {
  const lines = editor.value.split('\n');
  const totalLines = Math.max(1, lines.length);

  const editorScrollable = editor.scrollHeight - editor.clientHeight;
  if (editorScrollable <= 0) return 0;

  const previewScrollable = previewContainer.scrollHeight - previewContainer.clientHeight;
  if (previewScrollable <= 0) return 0;

  // Approximate current top visible line in textarea
  const approxLineHeight = editor.scrollHeight / totalLines;
  const currentLine = Math.min(totalLines - 1, Math.max(0, editor.scrollTop / approxLineHeight));

  const domAnchors = collectDOMAnchors(previewContainer);
  if (domAnchors.length === 0) {
    // Fallback to proportional scroll if no DOM anchors exist yet
    const ratio = editor.scrollTop / editorScrollable;
    return ratio * previewScrollable;
  }

  // At top of editor
  if (editor.scrollTop <= 2) return 0;
  // At bottom of editor
  if (editor.scrollTop >= editorScrollable - 2) return previewScrollable;

  // Find surrounding anchors
  let prevAnchor: DOMAnchor = { line: 0, offsetTop: 0 };
  let nextAnchor: DOMAnchor = domAnchors[domAnchors.length - 1];

  for (let i = 0; i < domAnchors.length; i++) {
    if (domAnchors[i].line <= currentLine) {
      prevAnchor = domAnchors[i];
    }
    if (domAnchors[i].line >= currentLine) {
      nextAnchor = domAnchors[i];
      break;
    }
  }

  if (prevAnchor.line === nextAnchor.line) {
    return Math.min(previewScrollable, Math.max(0, prevAnchor.offsetTop));
  }

  const progress = (currentLine - prevAnchor.line) / (nextAnchor.line - prevAnchor.line);
  const targetOffset = prevAnchor.offsetTop + progress * (nextAnchor.offsetTop - prevAnchor.offsetTop);

  return Math.min(previewScrollable, Math.max(0, targetOffset));
}

/**
 * Calculates Editor scrollTop from Preview scrollTop using anchor interpolation
 */
export function calculateEditorScrollFromPreview(
  previewContainer: HTMLElement,
  editor: HTMLTextAreaElement
): number {
  const lines = editor.value.split('\n');
  const totalLines = Math.max(1, lines.length);

  const previewScrollable = previewContainer.scrollHeight - previewContainer.clientHeight;
  if (previewScrollable <= 0) return 0;

  const editorScrollable = editor.scrollHeight - editor.clientHeight;
  if (editorScrollable <= 0) return 0;

  // At top of preview
  if (previewContainer.scrollTop <= 2) return 0;
  // At bottom of preview
  if (previewContainer.scrollTop >= previewScrollable - 2) return editorScrollable;

  const domAnchors = collectDOMAnchors(previewContainer);
  if (domAnchors.length === 0) {
    const ratio = previewContainer.scrollTop / previewScrollable;
    return ratio * editorScrollable;
  }

  const currentPreviewTop = previewContainer.scrollTop;

  let prevAnchor: DOMAnchor = domAnchors[0];
  let nextAnchor: DOMAnchor = domAnchors[domAnchors.length - 1];

  for (let i = 0; i < domAnchors.length; i++) {
    if (domAnchors[i].offsetTop <= currentPreviewTop) {
      prevAnchor = domAnchors[i];
    }
    if (domAnchors[i].offsetTop >= currentPreviewTop) {
      nextAnchor = domAnchors[i];
      break;
    }
  }

  let mappedLine: number;
  if (prevAnchor.offsetTop === nextAnchor.offsetTop) {
    mappedLine = prevAnchor.line;
  } else {
    const progress =
      (currentPreviewTop - prevAnchor.offsetTop) / (nextAnchor.offsetTop - prevAnchor.offsetTop);
    mappedLine = prevAnchor.line + progress * (nextAnchor.line - prevAnchor.line);
  }

  const approxLineHeight = editor.scrollHeight / totalLines;
  const targetEditorScroll = mappedLine * approxLineHeight;

  return Math.min(editorScrollable, Math.max(0, targetEditorScroll));
}

export type ScrollSource = 'editor' | 'preview' | null;

export class BidirectionalScrollSync {
  private activeSource: ScrollSource = null;
  private unlockTimer: any = null;
  private isEnabled = true;

  constructor(initialEnabled = true) {
    this.isEnabled = initialEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public isSyncEnabled(): boolean {
    return this.isEnabled;
  }

  public getActiveSource(): ScrollSource {
    return this.activeSource;
  }

  /**
   * Called when the Editor scrolls
   */
  public handleEditorScroll(
    editor: HTMLTextAreaElement | null,
    preview: HTMLElement | null
  ): void {
    if (!this.isEnabled || !editor || !preview) return;
    if (this.activeSource === 'preview') return;

    this.activeSource = 'editor';
    const targetTop = calculatePreviewScrollFromEditor(editor, preview);
    preview.scrollTop = targetTop;

    clearTimeout(this.unlockTimer);
    this.unlockTimer = setTimeout(() => {
      this.activeSource = null;
    }, 60);
  }

  /**
   * Called when the Preview scrolls
   */
  public handlePreviewScroll(
    preview: HTMLElement | null,
    editor: HTMLTextAreaElement | null
  ): void {
    if (!this.isEnabled || !preview || !editor) return;
    if (this.activeSource === 'editor') return;

    this.activeSource = 'preview';
    const targetTop = calculateEditorScrollFromPreview(preview, editor);
    editor.scrollTop = targetTop;

    clearTimeout(this.unlockTimer);
    this.unlockTimer = setTimeout(() => {
      this.activeSource = null;
    }, 60);
  }

  public destroy(): void {
    clearTimeout(this.unlockTimer);
    this.activeSource = null;
  }
}
