import { Note } from '../../types';

export type SlideThemeId =
  | 'obsidian-slate'
  | 'editorial-ivory'
  | 'academic-latex'
  | 'emerald-botanical'
  | 'sunset-amber'
  | 'midnight-cyber';

export interface SlideThemeConfig {
  id: SlideThemeId;
  name: string;
  description: string;
  bgClass: string;
  textClass: string;
  accentClass: string;
  cardBgClass: string;
  borderClass: string;
  codeBgClass: string;
  fontFamily: string;
  isDark: boolean;
}

export type SlideLayout =
  | 'title'
  | 'standard'
  | 'split'
  | 'quote'
  | 'section';

export interface SlideItem {
  id: string;
  index: number;
  rawContent: string;
  title: string;
  body: string;
  speakerNotes: string;
  layout: SlideLayout;
  fragments: string[]; // Step-by-step bullet reveals
  leftColumn?: string;
  rightColumn?: string;
  quoteAuthor?: string;
}

export interface PresentationDeck {
  id: string;
  title: string;
  sourceNoteId?: string;
  slides: SlideItem[];
  theme: SlideThemeId;
  aspectRatio: '16:9' | '4:3';
  author?: string;
  date?: string;
}

export type PresentationTemplateType =
  | 'pitch-deck'
  | 'research-talk'
  | 'team-sync'
  | 'technical-architecture';

export const PRESENTATION_THEMES: Record<SlideThemeId, SlideThemeConfig> = {
  'obsidian-slate': {
    id: 'obsidian-slate',
    name: 'Obsidian Slate',
    description: 'Deep modern dark graphite with purple & amber accents',
    bgClass: 'bg-stone-950',
    textClass: 'text-stone-100',
    accentClass: 'text-purple-400 border-purple-500/30',
    cardBgClass: 'bg-stone-900/80 border-stone-800',
    borderClass: 'border-stone-800',
    codeBgClass: 'bg-black/60',
    fontFamily: 'font-sans',
    isDark: true,
  },
  'editorial-ivory': {
    id: 'editorial-ivory',
    name: 'Editorial Ivory',
    description: 'Sophisticated warm cream paper with rich dark ink',
    bgClass: 'bg-[#faf8f5]',
    textClass: 'text-stone-900',
    accentClass: 'text-amber-800 border-amber-800/30',
    cardBgClass: 'bg-white/90 border-stone-300 shadow-sm',
    borderClass: 'border-stone-300',
    codeBgClass: 'bg-stone-100',
    fontFamily: 'font-serif',
    isDark: false,
  },
  'academic-latex': {
    id: 'academic-latex',
    name: 'Academic LaTeX',
    description: 'Pure clean monochrome, structured typography for research',
    bgClass: 'bg-white',
    textClass: 'text-neutral-900',
    accentClass: 'text-blue-700 border-blue-600/30',
    cardBgClass: 'bg-neutral-50 border-neutral-200',
    borderClass: 'border-neutral-200',
    codeBgClass: 'bg-neutral-100',
    fontFamily: 'font-mono',
    isDark: false,
  },
  'emerald-botanical': {
    id: 'emerald-botanical',
    name: 'Emerald Botanical',
    description: 'Calm deep emerald slate with mint & gold accents',
    bgClass: 'bg-[#0a1914]',
    textClass: 'text-emerald-50',
    accentClass: 'text-emerald-400 border-emerald-500/30',
    cardBgClass: 'bg-[#102a22]/80 border-emerald-900',
    borderClass: 'border-emerald-900',
    codeBgClass: 'bg-[#06110d]',
    fontFamily: 'font-sans',
    isDark: true,
  },
  'sunset-amber': {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    description: 'Warm obsidian dusk with terracotta & bright gold lights',
    bgClass: 'bg-[#181112]',
    textClass: 'text-amber-50',
    accentClass: 'text-amber-400 border-amber-500/30',
    cardBgClass: 'bg-[#261a1d]/80 border-amber-900/40',
    borderClass: 'border-amber-900/30',
    codeBgClass: 'bg-black/50',
    fontFamily: 'font-sans',
    isDark: true,
  },
  'midnight-cyber': {
    id: 'midnight-cyber',
    name: 'Midnight Cyber',
    description: 'High-contrast futuristic deep indigo with cyan neon',
    bgClass: 'bg-[#090b16]',
    textClass: 'text-cyan-50',
    accentClass: 'text-cyan-400 border-cyan-500/30',
    cardBgClass: 'bg-[#12162e]/80 border-cyan-900/40',
    borderClass: 'border-cyan-900/40',
    codeBgClass: 'bg-black/70',
    fontFamily: 'font-sans',
    isDark: true,
  },
};
