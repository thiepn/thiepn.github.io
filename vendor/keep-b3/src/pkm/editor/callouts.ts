import React from 'react';
import {
  Info,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Quote as QuoteIcon,
  Bug,
  Flame,
  CheckSquare,
  FileText,
  Sparkles,
} from 'lucide-react';

export type CalloutType =
  | 'note'
  | 'tip'
  | 'important'
  | 'warning'
  | 'caution'
  | 'info'
  | 'success'
  | 'danger'
  | 'bug'
  | 'example'
  | 'quote'
  | 'question'
  | 'faq'
  | 'todo';

export interface CalloutConfig {
  type: CalloutType;
  label: string;
  iconName: string;
  borderColor: string;
  bgColorLight: string;
  bgColorDark: string;
  titleColorLight: string;
  titleColorDark: string;
  badgeBgLight: string;
  badgeBgDark: string;
  iconColor: string;
}

export interface ParsedCallout {
  type: CalloutType;
  customTitle?: string;
  title: string;
  isCollapsible: boolean;
  defaultCollapsed: boolean;
  content: string;
  lines: string[];
  startLine: number;
  endLine: number;
}

export const CALLOUT_REGISTRY: Record<CalloutType, CalloutConfig> = {
  note: {
    type: 'note',
    label: 'Note',
    iconName: 'Info',
    borderColor: 'border-blue-500',
    bgColorLight: 'bg-blue-50/70',
    bgColorDark: 'dark:bg-blue-950/30',
    titleColorLight: 'text-blue-900',
    titleColorDark: 'dark:text-blue-200',
    badgeBgLight: 'bg-blue-100',
    badgeBgDark: 'dark:bg-blue-900/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  info: {
    type: 'info',
    label: 'Info',
    iconName: 'Info',
    borderColor: 'border-sky-500',
    bgColorLight: 'bg-sky-50/70',
    bgColorDark: 'dark:bg-sky-950/30',
    titleColorLight: 'text-sky-900',
    titleColorDark: 'dark:text-sky-200',
    badgeBgLight: 'bg-sky-100',
    badgeBgDark: 'dark:bg-sky-900/60',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  tip: {
    type: 'tip',
    label: 'Tip',
    iconName: 'Lightbulb',
    borderColor: 'border-emerald-500',
    bgColorLight: 'bg-emerald-50/70',
    bgColorDark: 'dark:bg-emerald-950/30',
    titleColorLight: 'text-emerald-900',
    titleColorDark: 'dark:text-emerald-200',
    badgeBgLight: 'bg-emerald-100',
    badgeBgDark: 'dark:bg-emerald-900/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  important: {
    type: 'important',
    label: 'Important',
    iconName: 'AlertOctagon',
    borderColor: 'border-indigo-500',
    bgColorLight: 'bg-indigo-50/70',
    bgColorDark: 'dark:bg-indigo-950/30',
    titleColorLight: 'text-indigo-900',
    titleColorDark: 'dark:text-indigo-200',
    badgeBgLight: 'bg-indigo-100',
    badgeBgDark: 'dark:bg-indigo-900/60',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  warning: {
    type: 'warning',
    label: 'Warning',
    iconName: 'AlertTriangle',
    borderColor: 'border-amber-500',
    bgColorLight: 'bg-amber-50/70',
    bgColorDark: 'dark:bg-amber-950/30',
    titleColorLight: 'text-amber-900',
    titleColorDark: 'dark:text-amber-200',
    badgeBgLight: 'bg-amber-100',
    badgeBgDark: 'dark:bg-amber-900/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  caution: {
    type: 'caution',
    label: 'Caution',
    iconName: 'ShieldAlert',
    borderColor: 'border-red-500',
    bgColorLight: 'bg-red-50/70',
    bgColorDark: 'dark:bg-red-950/30',
    titleColorLight: 'text-red-900',
    titleColorDark: 'dark:text-red-200',
    badgeBgLight: 'bg-red-100',
    badgeBgDark: 'dark:bg-red-900/60',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  danger: {
    type: 'danger',
    label: 'Danger',
    iconName: 'Flame',
    borderColor: 'border-rose-500',
    bgColorLight: 'bg-rose-50/70',
    bgColorDark: 'dark:bg-rose-950/30',
    titleColorLight: 'text-rose-900',
    titleColorDark: 'dark:text-rose-200',
    badgeBgLight: 'bg-rose-100',
    badgeBgDark: 'dark:bg-rose-900/60',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  success: {
    type: 'success',
    label: 'Success',
    iconName: 'CheckCircle2',
    borderColor: 'border-teal-500',
    bgColorLight: 'bg-teal-50/70',
    bgColorDark: 'dark:bg-teal-950/30',
    titleColorLight: 'text-teal-900',
    titleColorDark: 'dark:text-teal-200',
    badgeBgLight: 'bg-teal-100',
    badgeBgDark: 'dark:bg-teal-900/60',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  question: {
    type: 'question',
    label: 'Question',
    iconName: 'HelpCircle',
    borderColor: 'border-cyan-500',
    bgColorLight: 'bg-cyan-50/70',
    bgColorDark: 'dark:bg-cyan-950/30',
    titleColorLight: 'text-cyan-900',
    titleColorDark: 'dark:text-cyan-200',
    badgeBgLight: 'bg-cyan-100',
    badgeBgDark: 'dark:bg-cyan-900/60',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  faq: {
    type: 'faq',
    label: 'FAQ',
    iconName: 'HelpCircle',
    borderColor: 'border-cyan-500',
    bgColorLight: 'bg-cyan-50/70',
    bgColorDark: 'dark:bg-cyan-950/30',
    titleColorLight: 'text-cyan-900',
    titleColorDark: 'dark:text-cyan-200',
    badgeBgLight: 'bg-cyan-100',
    badgeBgDark: 'dark:bg-cyan-900/60',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  quote: {
    type: 'quote',
    label: 'Quote',
    iconName: 'QuoteIcon',
    borderColor: 'border-stone-400 dark:border-stone-600',
    bgColorLight: 'bg-stone-50/80',
    bgColorDark: 'dark:bg-stone-850/50',
    titleColorLight: 'text-stone-900',
    titleColorDark: 'dark:text-stone-200',
    badgeBgLight: 'bg-stone-200',
    badgeBgDark: 'dark:bg-stone-800',
    iconColor: 'text-stone-600 dark:text-stone-400',
  },
  bug: {
    type: 'bug',
    label: 'Bug',
    iconName: 'Bug',
    borderColor: 'border-rose-500',
    bgColorLight: 'bg-rose-50/70',
    bgColorDark: 'dark:bg-rose-950/30',
    titleColorLight: 'text-rose-900',
    titleColorDark: 'dark:text-rose-200',
    badgeBgLight: 'bg-rose-100',
    badgeBgDark: 'dark:bg-rose-900/60',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  example: {
    type: 'example',
    label: 'Example',
    iconName: 'Sparkles',
    borderColor: 'border-purple-500',
    bgColorLight: 'bg-purple-50/70',
    bgColorDark: 'dark:bg-purple-950/30',
    titleColorLight: 'text-purple-900',
    titleColorDark: 'dark:text-purple-200',
    badgeBgLight: 'bg-purple-100',
    badgeBgDark: 'dark:bg-purple-900/60',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  todo: {
    type: 'todo',
    label: 'Todo',
    iconName: 'CheckSquare',
    borderColor: 'border-blue-500',
    bgColorLight: 'bg-blue-50/70',
    bgColorDark: 'dark:bg-blue-950/30',
    titleColorLight: 'text-blue-900',
    titleColorDark: 'dark:text-blue-200',
    badgeBgLight: 'bg-blue-100',
    badgeBgDark: 'dark:bg-blue-900/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
};

/**
 * Normalizes callout type string to recognized CalloutType
 */
export function normalizeCalloutType(rawType: string): CalloutType {
  const lower = rawType.toLowerCase().trim();
  if (lower in CALLOUT_REGISTRY) {
    return lower as CalloutType;
  }
  // Common aliases
  if (lower === 'hint') return 'tip';
  if (lower === 'danger' || lower === 'error') return 'caution';
  if (lower === 'check' || lower === 'done') return 'success';
  if (lower === 'warn') return 'warning';
  if (lower === 'cite') return 'quote';
  if (lower === 'help') return 'question';

  return 'note';
}

/**
 * Checks if a line is the opening line of a GFM/Obsidian callout:
 * e.g. > [!NOTE]
 * e.g. > [!WARNING] Important limitation
 * e.g. > [!TIP]- Collapsed tip
 * e.g. > [!IMPORTANT]+ Expanded note
 */
export function parseCalloutHeader(
  line: string
): {
  type: CalloutType;
  title: string;
  customTitle?: string;
  isCollapsible: boolean;
  defaultCollapsed: boolean;
} | null {
  const match = line.match(/^>\s*\[!([a-zA-Z0-9_-]+)\]([+-]?)(?:\s+(.*))?$/);
  if (!match) return null;

  const rawType = match[1];
  const collapseIndicator = match[2]; // "-" or "+" or ""
  const customTitle = match[3]?.trim();

  const type = normalizeCalloutType(rawType);
  const config = CALLOUT_REGISTRY[type] || CALLOUT_REGISTRY.note;
  const isCollapsible = collapseIndicator === '-' || collapseIndicator === '+';
  const defaultCollapsed = collapseIndicator === '-';
  const title = customTitle || config.label;

  return {
    type,
    title,
    customTitle: customTitle || undefined,
    isCollapsible,
    defaultCollapsed,
  };
}

/**
 * Parses a complete multi-line callout block starting at startIndex
 */
export function parseCalloutBlock(
  lines: string[],
  startIndex: number
): { callout: ParsedCallout; nextIndex: number } | null {
  if (startIndex >= lines.length) return null;

  const header = parseCalloutHeader(lines[startIndex]);
  if (!header) return null;

  const contentLines: string[] = [];
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i];
    // Blockquote lines in callout start with `>`
    if (line.startsWith('>')) {
      contentLines.push(line.replace(/^>\s?/, ''));
      i++;
    } else if (line.trim() === '') {
      // Empty line could be part of callout if followed by another `>`
      if (i + 1 < lines.length && lines[i + 1].startsWith('>')) {
        contentLines.push('');
        i++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  const callout: ParsedCallout = {
    type: header.type,
    customTitle: header.customTitle,
    title: header.title,
    isCollapsible: header.isCollapsible,
    defaultCollapsed: header.defaultCollapsed,
    content: contentLines.join('\n'),
    lines: contentLines,
    startLine: startIndex,
    endLine: i - 1,
  };

  return { callout, nextIndex: i };
}

/**
 * Generates markdown snippet for inserting a callout
 */
export function createCalloutSnippet(
  type: CalloutType = 'note',
  title?: string,
  collapsible?: '+' | '-'
): { snippet: string; text: string; cursorOffset: number } {
  const collapseSign = collapsible || '';
  const titlePart = title ? ` ${title}` : '';
  const text = `> [!${type.toUpperCase()}]${collapseSign}${titlePart}\n> `;
  return {
    snippet: text,
    text,
    cursorOffset: text.length,
  };
}
