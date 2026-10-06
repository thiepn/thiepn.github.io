export const PRISM_BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const;
export type PrismBreakpoint = (typeof PRISM_BREAKPOINTS)[number];

export const PRISM_BLOCK_TYPES = ['continue', 'now', 'apps', 'study', 'recent'] as const;
export type PrismBlockType = (typeof PRISM_BLOCK_TYPES)[number];

export const PRISM_BLOCK_SIZES = ['s', 'm', 'l', 'xl'] as const;
export type PrismBlockSize = (typeof PRISM_BLOCK_SIZES)[number];

export interface BlockSpan {
  w: number;
  h: number;
}

export interface PrismBlockDefinition {
  type: PrismBlockType;
  title: string;
  category: 'core' | 'study' | 'activity';
  supportedSizes: readonly PrismBlockSize[];
  defaultSize: PrismBlockSize;
  defaultSpan: Record<PrismBreakpoint, BlockSpan>;
  surface: 'plain' | 'soft' | 'focus';
  emphasis: 'quiet' | 'normal' | 'focus';
}

export const PRISM_COLUMNS: Record<PrismBreakpoint, number> = {
  desktop: 12,
  tablet: 8,
  mobile: 4,
};

export const PRISM_BLOCK_REGISTRY: Record<PrismBlockType, PrismBlockDefinition> = {
  continue: {
    type: 'continue',
    title: 'Continue',
    category: 'core',
    supportedSizes: ['m', 'l', 'xl'],
    defaultSize: 'l',
    defaultSpan: { desktop: { w: 8, h: 1 }, tablet: { w: 5, h: 1 }, mobile: { w: 4, h: 1 } },
    surface: 'focus',
    emphasis: 'focus',
  },
  now: {
    type: 'now',
    title: 'Now',
    category: 'core',
    supportedSizes: ['s', 'm'],
    defaultSize: 'm',
    defaultSpan: { desktop: { w: 4, h: 1 }, tablet: { w: 3, h: 1 }, mobile: { w: 4, h: 1 } },
    surface: 'plain',
    emphasis: 'normal',
  },
  apps: {
    type: 'apps',
    title: 'Apps',
    category: 'core',
    supportedSizes: ['l', 'xl'],
    defaultSize: 'xl',
    defaultSpan: { desktop: { w: 12, h: 1 }, tablet: { w: 8, h: 1 }, mobile: { w: 4, h: 1 } },
    surface: 'plain',
    emphasis: 'normal',
  },
  study: {
    type: 'study',
    title: 'Study',
    category: 'study',
    supportedSizes: ['m', 'l'],
    defaultSize: 'l',
    defaultSpan: { desktop: { w: 7, h: 1 }, tablet: { w: 5, h: 1 }, mobile: { w: 4, h: 1 } },
    surface: 'plain',
    emphasis: 'normal',
  },
  recent: {
    type: 'recent',
    title: 'Recent',
    category: 'activity',
    supportedSizes: ['m', 'l'],
    defaultSize: 'm',
    defaultSpan: { desktop: { w: 5, h: 1 }, tablet: { w: 3, h: 1 }, mobile: { w: 4, h: 1 } },
    surface: 'plain',
    emphasis: 'quiet',
  },
};

export function isPrismBlockType(value: unknown): value is PrismBlockType {
  return typeof value === 'string' && (PRISM_BLOCK_TYPES as readonly string[]).includes(value);
}

export function isPrismBlockSize(value: unknown): value is PrismBlockSize {
  return typeof value === 'string' && (PRISM_BLOCK_SIZES as readonly string[]).includes(value);
}
