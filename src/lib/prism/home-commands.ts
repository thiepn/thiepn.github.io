import {
  PRISM_BLOCK_REGISTRY,
  PRISM_COLUMNS,
  spanForBlock,
  type PrismBlockSize,
  type PrismBreakpoint,
} from './block-registry';
import type { HomeDocumentV2, HomePlacement } from './home-document';

function placementOrder(a: HomePlacement, b: HomePlacement): number {
  return a.y - b.y || a.x - b.x || a.blockId.localeCompare(b.blockId);
}

export function orderedSectionPlacements(
  document: HomeDocumentV2,
  breakpoint: PrismBreakpoint,
  sectionId: string,
): HomePlacement[] {
  return document.layouts[breakpoint].placements
    .filter((placement) => placement.sectionId === sectionId)
    .sort(placementOrder);
}

export function reflowSection(
  document: HomeDocumentV2,
  breakpoint: PrismBreakpoint,
  sectionId: string,
  order?: readonly string[],
): void {
  const columns = PRISM_COLUMNS[breakpoint];
  const placements = orderedSectionPlacements(document, breakpoint, sectionId);
  const byId = new Map(placements.map((placement) => [placement.blockId, placement]));
  const ids = order ? [...order] : placements.map((placement) => placement.blockId);

  if (new Set(ids).size !== ids.length || ids.some((id) => !byId.has(id)) || ids.length !== placements.length) {
    throw new Error(`Invalid reflow order for ${sectionId} at ${breakpoint}`);
  }

  let x = 0;
  let y = 0;
  let rowHeight = 1;

  for (const blockId of ids) {
    const placement = byId.get(blockId)!;
    if (placement.w > columns) throw new Error(`Block ${blockId} exceeds ${breakpoint} columns`);
    if (x > 0 && x + placement.w > columns) {
      x = 0;
      y += rowHeight;
      rowHeight = 1;
    }
    placement.x = x;
    placement.y = y;
    x += placement.w;
    rowHeight = Math.max(rowHeight, placement.h);
  }
}

export function moveBlock(
  document: HomeDocumentV2,
  breakpoint: PrismBreakpoint,
  blockId: string,
  direction: -1 | 1,
): boolean {
  const placement = document.layouts[breakpoint].placements.find((item) => item.blockId === blockId);
  if (!placement) throw new Error(`Missing ${breakpoint} placement for ${blockId}`);

  const ordered = orderedSectionPlacements(document, breakpoint, placement.sectionId).map((item) => item.blockId);
  const index = ordered.indexOf(blockId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return false;

  [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
  reflowSection(document, breakpoint, placement.sectionId, ordered);
  return true;
}

export function resizeBlock(
  document: HomeDocumentV2,
  breakpoint: PrismBreakpoint,
  blockId: string,
  size: PrismBlockSize,
): boolean {
  const placement = document.layouts[breakpoint].placements.find((item) => item.blockId === blockId);
  if (!placement) throw new Error(`Missing ${breakpoint} placement for ${blockId}`);
  const block = document.blocks[blockId];
  if (!block) throw new Error(`Missing block ${blockId}`);

  const definition = PRISM_BLOCK_REGISTRY[block.type];
  if (!definition.supportedSizes.includes(size)) throw new Error(`Unsupported size ${size} for block type ${block.type}`);
  if (placement.size === size) return false;

  const order = orderedSectionPlacements(document, breakpoint, placement.sectionId).map((item) => item.blockId);
  const span = spanForBlock(block.type, size, breakpoint);
  placement.size = size;
  placement.w = span.w;
  placement.h = span.h;
  reflowSection(document, breakpoint, placement.sectionId, order);
  return true;
}

export function setBlockHidden(document: HomeDocumentV2, blockId: string, hidden: boolean): boolean {
  const block = document.blocks[blockId];
  if (!block) throw new Error(`Missing block ${blockId}`);
  if ((block.hidden === true) === hidden) return false;
  block.hidden = hidden || undefined;
  return true;
}

export function setDensity(
  document: HomeDocumentV2,
  density: HomeDocumentV2['appearance']['density'],
): boolean {
  if (document.appearance.density === density) return false;
  document.appearance.density = density;
  return true;
}

export function setMode(
  document: HomeDocumentV2,
  mode: HomeDocumentV2['appearance']['mode'],
): boolean {
  if (document.appearance.mode === mode) return false;
  document.appearance.mode = mode;
  return true;
}

export function setIntensity(
  document: HomeDocumentV2,
  intensity: HomeDocumentV2['appearance']['intensity'],
): boolean {
  if (document.appearance.intensity === intensity) return false;
  document.appearance.intensity = intensity;
  return true;
}

export function setMotion(
  document: HomeDocumentV2,
  motion: HomeDocumentV2['appearance']['motion'],
): boolean {
  if (document.appearance.motion === motion) return false;
  document.appearance.motion = motion;
  return true;
}
