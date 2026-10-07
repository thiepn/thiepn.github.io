import {
  PRISM_BLOCK_REGISTRY,
  PRISM_BREAKPOINTS,
  PRISM_COLUMNS,
  isPrismBlockSize,
  isPrismBlockType,
  spanForBlock,
  type PrismBlockSize,
  type PrismBlockType,
  type PrismBreakpoint,
} from './block-registry';

export const HOME_DOCUMENT_SCHEMA_VERSION = 2 as const;

export interface HomeBlock {
  id: string;
  type: PrismBlockType;
  hidden?: boolean;
  settings: Record<string, unknown>;
}

export interface HomeSection {
  id: string;
  blockIds: string[];
}

export interface HomePage {
  id: string;
  sectionIds: string[];
}

export interface HomePlacement {
  blockId: string;
  sectionId: string;
  size: PrismBlockSize;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HomeResponsiveLayout {
  sectionOrder: string[];
  placements: HomePlacement[];
}

export interface HomeAppearance {
  theme: 'prism';
  mode: 'system' | 'light' | 'dark';
  density: 'compact' | 'balanced' | 'comfortable';
  intensity: 'quiet' | 'balanced' | 'rich';
  motion: 'reduced' | 'balanced' | 'expressive';
  surface: 'default';
  cornerStyle: 'default';
  iconStyle: 'rich' | 'mono';
}

export interface HomeDocumentV2 {
  schemaVersion: typeof HOME_DOCUMENT_SCHEMA_VERSION;
  pages: HomePage[];
  sections: Record<string, HomeSection>;
  blocks: Record<string, HomeBlock>;
  layouts: Record<PrismBreakpoint, HomeResponsiveLayout>;
  appearance: HomeAppearance;
  preferences: { customizeMobileSeparately: boolean };
}

const IDS = {
  page: 'home',
  start: 'section-start',
  apps: 'section-apps',
  activity: 'section-activity',
  continue: 'block-continue',
  now: 'block-now',
  appsBlock: 'block-apps',
  study: 'block-study',
  recent: 'block-recent',
} as const;

function placement(
  blockId: string,
  sectionId: string,
  x: number,
  y: number,
  breakpoint: PrismBreakpoint,
  type: PrismBlockType,
  size = PRISM_BLOCK_REGISTRY[type].defaultSize,
): HomePlacement {
  const { w, h } = spanForBlock(type, size, breakpoint);
  return { blockId, sectionId, size, x, y, w, h };
}

export function createDefaultHomeDocument(): HomeDocumentV2 {
  return {
    schemaVersion: HOME_DOCUMENT_SCHEMA_VERSION,
    pages: [{ id: IDS.page, sectionIds: [IDS.start, IDS.apps, IDS.activity] }],
    sections: {
      [IDS.start]: { id: IDS.start, blockIds: [IDS.continue, IDS.now] },
      [IDS.apps]: { id: IDS.apps, blockIds: [IDS.appsBlock] },
      [IDS.activity]: { id: IDS.activity, blockIds: [IDS.study, IDS.recent] },
    },
    blocks: {
      [IDS.continue]: { id: IDS.continue, type: 'continue', settings: {} },
      [IDS.now]: { id: IDS.now, type: 'now', settings: {} },
      [IDS.appsBlock]: { id: IDS.appsBlock, type: 'apps', settings: {} },
      [IDS.study]: { id: IDS.study, type: 'study', settings: {} },
      [IDS.recent]: { id: IDS.recent, type: 'recent', settings: {} },
    },
    layouts: {
      desktop: {
        sectionOrder: [IDS.start, IDS.apps, IDS.activity],
        placements: [
          placement(IDS.continue, IDS.start, 0, 0, 'desktop', 'continue'),
          placement(IDS.now, IDS.start, 8, 0, 'desktop', 'now'),
          placement(IDS.appsBlock, IDS.apps, 0, 0, 'desktop', 'apps'),
          placement(IDS.study, IDS.activity, 0, 0, 'desktop', 'study'),
          placement(IDS.recent, IDS.activity, 7, 0, 'desktop', 'recent'),
        ],
      },
      tablet: {
        sectionOrder: [IDS.start, IDS.apps, IDS.activity],
        placements: [
          placement(IDS.continue, IDS.start, 0, 0, 'tablet', 'continue'),
          placement(IDS.now, IDS.start, 5, 0, 'tablet', 'now'),
          placement(IDS.appsBlock, IDS.apps, 0, 0, 'tablet', 'apps'),
          placement(IDS.study, IDS.activity, 0, 0, 'tablet', 'study'),
          placement(IDS.recent, IDS.activity, 5, 0, 'tablet', 'recent'),
        ],
      },
      mobile: {
        sectionOrder: [IDS.start, IDS.apps, IDS.activity],
        placements: [
          placement(IDS.continue, IDS.start, 0, 0, 'mobile', 'continue'),
          placement(IDS.now, IDS.start, 0, 1, 'mobile', 'now'),
          placement(IDS.appsBlock, IDS.apps, 0, 0, 'mobile', 'apps'),
          placement(IDS.study, IDS.activity, 0, 0, 'mobile', 'study'),
          placement(IDS.recent, IDS.activity, 0, 1, 'mobile', 'recent'),
        ],
      },
    },
    appearance: {
      theme: 'prism',
      mode: 'system',
      density: 'balanced',
      intensity: 'balanced',
      motion: 'balanced',
      surface: 'default',
      cornerStyle: 'default',
      iconStyle: 'rich',
    },
    preferences: { customizeMobileSeparately: false },
  };
}

export interface HomeDocumentValidation {
  valid: boolean;
  errors: string[];
}

function boxesOverlap(a: HomePlacement, b: HomePlacement): boolean {
  if (a.sectionId !== b.sectionId) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function validateHomeDocument(input: unknown): HomeDocumentValidation {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['HomeDocument must be an object.'] };
  }

  const doc = input as Partial<HomeDocumentV2>;
  if (doc.schemaVersion !== HOME_DOCUMENT_SCHEMA_VERSION) errors.push('Unsupported HomeDocument schemaVersion.');
  if (!doc.blocks || typeof doc.blocks !== 'object' || Array.isArray(doc.blocks)) errors.push('blocks must be an object.');
  if (!doc.sections || typeof doc.sections !== 'object' || Array.isArray(doc.sections)) errors.push('sections must be an object.');
  if (!Array.isArray(doc.pages) || doc.pages.length === 0) errors.push('pages must contain at least one page.');

  const blocks = doc.blocks && typeof doc.blocks === 'object' && !Array.isArray(doc.blocks)
    ? doc.blocks as Record<string, HomeBlock>
    : {};
  const sections = doc.sections && typeof doc.sections === 'object' && !Array.isArray(doc.sections)
    ? doc.sections as Record<string, HomeSection>
    : {};

  const appearance = doc.appearance;
  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) {
    errors.push('appearance must be an object.');
  } else {
    if (appearance.theme !== 'prism') errors.push('Unsupported Home appearance theme.');
    if (!['system', 'light', 'dark'].includes(String(appearance.mode))) errors.push('Invalid Home appearance mode.');
    if (!['compact', 'balanced', 'comfortable'].includes(String(appearance.density))) errors.push('Invalid Home density.');
    if (!['quiet', 'balanced', 'rich'].includes(String(appearance.intensity))) errors.push('Invalid Home visual intensity.');
    if (!['reduced', 'balanced', 'expressive'].includes(String(appearance.motion))) errors.push('Invalid Home motion setting.');
    if (appearance.surface !== 'default') errors.push('Invalid Home surface setting.');
    if (appearance.cornerStyle !== 'default') errors.push('Invalid Home corner setting.');
    if (!['rich', 'mono'].includes(String(appearance.iconStyle))) errors.push('Invalid Home icon setting.');
  }

  if (!doc.preferences || typeof doc.preferences !== 'object' || Array.isArray(doc.preferences)
    || typeof doc.preferences.customizeMobileSeparately !== 'boolean') {
    errors.push('Invalid Home preferences.');
  }

  for (const [key, block] of Object.entries(blocks)) {
    if (!block || typeof block !== 'object') { errors.push(`Block ${key} is invalid.`); continue; }
    if (block.id !== key) errors.push(`Block key/id mismatch for ${key}.`);
    if (!isPrismBlockType(block.type)) errors.push(`Unknown block type for ${key}.`);
    if (block.hidden !== undefined && typeof block.hidden !== 'boolean') errors.push(`Block ${key} hidden must be boolean.`);
    if (!block.settings || typeof block.settings !== 'object' || Array.isArray(block.settings)) errors.push(`Block ${key} settings must be an object.`);
    if (block.type === 'apps' && block.settings && typeof block.settings === 'object' && !Array.isArray(block.settings)) {
      const order = (block.settings as Record<string, unknown>).appOrder;
      if (order !== undefined && (!Array.isArray(order) || order.length > 128 || !order.every((item) => typeof item === 'string') || new Set(order).size !== order.length)) {
        errors.push('Apps appOrder must be a unique string array of at most 128 items.');
      }
    }
  }

  const blockMembership = new Map<string, string>();
  for (const [key, section] of Object.entries(sections)) {
    if (!section || typeof section !== 'object') { errors.push(`Section ${key} is invalid.`); continue; }
    if (section.id !== key) errors.push(`Section key/id mismatch for ${key}.`);
    if (!Array.isArray(section.blockIds)) { errors.push(`Section ${key} blockIds must be an array.`); continue; }
    if (new Set(section.blockIds).size !== section.blockIds.length) errors.push(`Section ${key} contains duplicate block IDs.`);
    for (const blockId of section.blockIds) {
      if (!blocks[blockId]) errors.push(`Section ${key} references missing block ${blockId}.`);
      const existing = blockMembership.get(blockId);
      if (existing && existing !== key) errors.push(`Block ${blockId} belongs to multiple sections.`);
      else blockMembership.set(blockId, key);
    }
  }
  for (const blockId of Object.keys(blocks)) {
    if (!blockMembership.has(blockId)) errors.push(`Block ${blockId} does not belong to a section.`);
  }

  for (const page of doc.pages ?? []) {
    if (!page || typeof page !== 'object' || !Array.isArray(page.sectionIds)) { errors.push('Invalid page definition.'); continue; }
    if (new Set(page.sectionIds).size !== page.sectionIds.length) errors.push(`Page ${page.id} contains duplicate sections.`);
    for (const sectionId of page.sectionIds) if (!sections[sectionId]) errors.push(`Page ${page.id} references missing section ${sectionId}.`);
  }

  if (!doc.layouts || typeof doc.layouts !== 'object') {
    errors.push('layouts must be present.');
  } else {
    for (const breakpoint of PRISM_BREAKPOINTS) {
      const layout = doc.layouts[breakpoint];
      if (!layout || !Array.isArray(layout.sectionOrder) || !Array.isArray(layout.placements)) {
        errors.push(`Missing or invalid ${breakpoint} layout.`);
        continue;
      }
      if (new Set(layout.sectionOrder).size !== layout.sectionOrder.length) errors.push(`Duplicate sections in ${breakpoint} sectionOrder.`);
      for (const sectionId of layout.sectionOrder) if (!sections[sectionId]) errors.push(`${breakpoint} sectionOrder references missing section ${sectionId}.`);

      const columns = PRISM_COLUMNS[breakpoint];
      const seen = new Set<string>();
      for (const p of layout.placements) {
        if (seen.has(p.blockId)) errors.push(`Duplicate ${breakpoint} placement for ${p.blockId}.`);
        seen.add(p.blockId);

        const block = blocks[p.blockId];
        if (!block) {
          errors.push(`${breakpoint} layout references missing block ${p.blockId}.`);
        } else if (isPrismBlockType(block.type)) {
          if (!isPrismBlockSize(p.size) || !PRISM_BLOCK_REGISTRY[block.type].supportedSizes.includes(p.size)) {
            errors.push(`Unsupported ${breakpoint} size ${String(p.size)} for block type ${block.type}.`);
          } else {
            const expected = spanForBlock(block.type, p.size, breakpoint);
            if (p.w !== expected.w || p.h !== expected.h) {
              errors.push(`Span mismatch for ${p.blockId} at ${breakpoint}: ${p.size} expects ${expected.w}x${expected.h}.`);
            }
          }
        }

        if (!sections[p.sectionId]) errors.push(`${breakpoint} layout references missing section ${p.sectionId}.`);
        else if (!sections[p.sectionId]!.blockIds.includes(p.blockId)) errors.push(`${breakpoint} placement ${p.blockId} is not a member of ${p.sectionId}.`);

        if (![p.x, p.y, p.w, p.h].every(Number.isInteger)) errors.push(`Non-integer ${breakpoint} placement for ${p.blockId}.`);
        if (p.x < 0 || p.y < 0 || p.w < 1 || p.h < 1 || p.x + p.w > columns) errors.push(`Out-of-bounds ${breakpoint} placement for ${p.blockId}.`);
      }

      for (const blockId of Object.keys(blocks)) if (!seen.has(blockId)) errors.push(`Missing ${breakpoint} placement for ${blockId}.`);

      for (let i = 0; i < layout.placements.length; i += 1) {
        for (let j = i + 1; j < layout.placements.length; j += 1) {
          const a = layout.placements[i]!;
          const b = layout.placements[j]!;
          if (boxesOverlap(a, b)) errors.push(`Overlapping ${breakpoint} placements: ${a.blockId} and ${b.blockId}.`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
