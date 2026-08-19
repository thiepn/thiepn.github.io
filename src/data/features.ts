/**
 * Lightweight feature flags for expressive, non-essential THE INDEX behavior.
 * Core navigation, search, archive state, accessibility, and reduced-motion
 * behavior must never be gated here.
 */
export const FEATURES = {
  livingIndexScanner: true,
  proximityActivation: true,
  sectionReveals: true,
  archiveLayoutMotion: true,
  animatedPreviews: true,
} as const;
