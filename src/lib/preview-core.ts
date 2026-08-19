export type PreviewState = 'poster' | 'armed' | 'active' | 'settled' | 'unavailable';
export type PreviewKind = 'static' | 'synthetic' | 'video';

export const PREVIEW_DEFAULT_DURATION = 3600;
export const PREVIEW_SYNTHETIC_DELAY = 180;
export const PREVIEW_VIDEO_DELAY = 280;

export function isInteractivePreviewType(type: string): type is Exclude<PreviewKind, 'static'> {
  return type === 'synthetic' || type === 'video';
}

export function getPreviewActivationDelay(type: PreviewKind): number {
  return type === 'video' ? PREVIEW_VIDEO_DELAY : PREVIEW_SYNTHETIC_DELAY;
}

export function getPreviewActiveLimit(coarsePointer: boolean): number {
  return coarsePointer ? 1 : 2;
}

export function normalizePreviewDuration(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return PREVIEW_DEFAULT_DURATION;
  return Math.min(Math.max(parsed, 1600), 6000);
}
