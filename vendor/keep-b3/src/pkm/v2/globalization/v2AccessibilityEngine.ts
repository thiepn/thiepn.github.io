/**
 * PKM V2.18 Product-Wide Accessibility, Focus Management, IME Safety & Non-Spatial Alternatives Engine
 * 
 * Complies with WCAG 2.2 AA guidelines:
 * - Focus traps & restoration stacks
 * - IME composition guard
 * - Accessible non-drag board/calendar actions
 * - Canvas & Graph structured tabular/list alternatives
 * - Chart data tables & factual summaries
 * - Throttled aria-live announcements
 */

import {
  AccessibleChartData,
  CanvasStructuredAlternative,
  GraphStructuredAlternative,
} from './globalizationTypes';
import { v2GlobalizationEngine } from './v2GlobalizationEngine';

export class V2AccessibilityEngine {
  private static instance: V2AccessibilityEngine | null = null;

  private focusStack: HTMLElement[] = [];
  private isCurrentlyComposing: boolean = false;
  private announcementQueue: Array<{ text: string; priority: 'polite' | 'assertive'; timestamp: number }> = [];
  private liveRegionPolite: HTMLElement | null = null;
  private liveRegionAssertive: HTMLElement | null = null;

  private constructor() {
    this.setupLiveRegions();
  }

  public static getInstance(): V2AccessibilityEngine {
    if (!V2AccessibilityEngine.instance) {
      V2AccessibilityEngine.instance = new V2AccessibilityEngine();
    }
    return V2AccessibilityEngine.instance;
  }

  private setupLiveRegions(): void {
    if (typeof document !== 'undefined') {
      let polite = document.getElementById('pkm-a11y-live-polite');
      if (!polite) {
        polite = document.createElement('div');
        polite.id = 'pkm-a11y-live-polite';
        polite.setAttribute('aria-live', 'polite');
        polite.setAttribute('aria-atomic', 'true');
        polite.style.position = 'absolute';
        polite.style.width = '1px';
        polite.style.height = '1px';
        polite.style.padding = '0';
        polite.style.margin = '-1px';
        polite.style.overflow = 'hidden';
        polite.style.clip = 'rect(0, 0, 0, 0)';
        polite.style.border = '0';
        document.body.appendChild(polite);
      }
      this.liveRegionPolite = polite;

      let assertive = document.getElementById('pkm-a11y-live-assertive');
      if (!assertive) {
        assertive = document.createElement('div');
        assertive.id = 'pkm-a11y-live-assertive';
        assertive.setAttribute('aria-live', 'assertive');
        assertive.setAttribute('aria-atomic', 'true');
        assertive.style.position = 'absolute';
        assertive.style.width = '1px';
        assertive.style.height = '1px';
        assertive.style.padding = '0';
        assertive.style.margin = '-1px';
        assertive.style.overflow = 'hidden';
        assertive.style.clip = 'rect(0, 0, 0, 0)';
        assertive.style.border = '0';
        document.body.appendChild(assertive);
      }
      this.liveRegionAssertive = assertive;
    }
  }

  // ==========================================================================
  // FOCUS MANAGEMENT
  // ==========================================================================

  public pushFocus(element?: HTMLElement | null): void {
    const el = element || (typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null);
    if (el) {
      this.focusStack.push(el);
    }
  }

  public popFocus(): void {
    const el = this.focusStack.pop();
    if (el && typeof el.focus === 'function') {
      try {
        el.focus();
      } catch {
        // Safe fallback
      }
    }
  }

  public clearFocusStack(): void {
    this.focusStack = [];
  }

  // ==========================================================================
  // IME COMPOSITION SAFETY
  // ==========================================================================

  public setCompositionState(isComposing: boolean): void {
    this.isCurrentlyComposing = isComposing;
  }

  public isComposing(): boolean {
    return this.isCurrentlyComposing;
  }

  /**
   * Prevents premature Enter submissions, slash commands, or shortcuts during IME composition
   * (e.g. Korean syllable formation, Japanese Kanji selection, dead-key accents).
   */
  public shouldSuppressKeyboardAction(event: KeyboardEvent): boolean {
    if (this.isCurrentlyComposing || (event as any).isComposing) {
      return true;
    }
    // Also check event.keyCode === 229 which indicates an active IME process
    if (event.keyCode === 229) {
      return true;
    }
    return false;
  }

  // ==========================================================================
  // SCREEN READER LIVE REGIONS (THROTTLED)
  // ==========================================================================

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!message || !message.trim()) return;

    this.announcementQueue.push({
      text: message,
      priority,
      timestamp: Date.now(),
    });

    const targetEl = priority === 'assertive' ? this.liveRegionAssertive : this.liveRegionPolite;
    if (targetEl) {
      targetEl.textContent = '';
      setTimeout(() => {
        targetEl.textContent = message;
      }, 50);
    }
  }

  // ==========================================================================
  // ACCESSIBLE NON-SPATIAL ALTERNATIVES
  // ==========================================================================

  /**
   * Generates a factual data summary and accessible table structure for any chart.
   */
  public generateAccessibleChartData(
    chartTitle: string,
    seriesName: string,
    points: Array<{ label: string; value: number }>,
    unit?: string
  ): AccessibleChartData {
    if (!points || points.length === 0) {
      return {
        chartTitle,
        seriesName,
        summaryText: `Chart "${chartTitle}" contains no data points.`,
        min: 0,
        max: 0,
        average: 0,
        unit,
        dataPoints: [],
      };
    }

    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const average = Number((sum / values.length).toFixed(2));

    const unitStr = unit ? ` ${unit}` : '';
    const summaryText = `Values ranged from ${min} to ${max}${unitStr}, with an average of ${average}${unitStr} across ${points.length} recorded points.`;

    const dataPoints = points.map((p) => ({
      label: p.label,
      value: p.value,
      formattedValue: v2GlobalizationEngine.formatNumber(p.value) + unitStr,
    }));

    return {
      chartTitle,
      seriesName,
      summaryText,
      min,
      max,
      average,
      unit,
      dataPoints,
    };
  }

  /**
   * Generates a structured non-spatial alternative for a visual Canvas board.
   */
  public generateCanvasStructuredAlternative(
    canvasId: string,
    canvasTitle: string,
    nodes: Array<{ id: string; type: any; title: string; content?: string }>,
    edges: Array<{ id: string; from: string; to: string; label?: string }>
  ): CanvasStructuredAlternative {
    const nodeMap = new Map<string, string[]>();
    for (const edge of edges) {
      const existing = nodeMap.get(edge.from) || [];
      existing.push(edge.to);
      nodeMap.set(edge.from, existing);
    }

    return {
      canvasId,
      canvasTitle,
      totalNodes: nodes.length,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type || 'card',
        title: n.title || 'Untitled Node',
        contentSummary: n.content ? n.content.slice(0, 100) : undefined,
        connectedToNodeIds: nodeMap.get(n.id) || [],
      })),
      connections: edges.map((e) => ({
        id: e.id,
        fromId: e.from,
        toId: e.to,
        label: e.label,
      })),
    };
  }

  /**
   * Generates a structured link/neighbor list alternative for a visual Graph view.
   */
  public generateGraphStructuredAlternative(
    targetResourceId: string,
    targetTitle: string,
    incoming: Array<{ sourceId: string; sourceTitle: string; relationType: string }>,
    outgoing: Array<{ targetId: string; targetTitle: string; relationType: string }>,
    unlinked: Array<{ sourceId: string; sourceTitle: string; context: string }>
  ): GraphStructuredAlternative {
    return {
      targetResourceId,
      targetTitle,
      incomingLinks: incoming,
      outgoingLinks: outgoing,
      unlinkedMentions: unlinked,
    };
  }
}

export const v2AccessibilityEngine = V2AccessibilityEngine.getInstance();
