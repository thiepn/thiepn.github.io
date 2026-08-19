export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function hasFinePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(FINE_POINTER_QUERY).matches;
}
