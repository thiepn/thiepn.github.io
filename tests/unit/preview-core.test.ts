import { describe, expect, it } from 'vitest';
import { getPreviewActivationDelay, getPreviewActiveLimit, isInteractivePreviewType, normalizePreviewDuration } from '../../src/lib/preview-core';

describe('preview core', () => {
  it('identifies only synthetic and video previews as interactive', () => {
    expect(isInteractivePreviewType('synthetic')).toBe(true);
    expect(isInteractivePreviewType('video')).toBe(true);
    expect(isInteractivePreviewType('static')).toBe(false);
  });

  it('uses a slower activation threshold for video media', () => {
    expect(getPreviewActivationDelay('synthetic')).toBe(180);
    expect(getPreviewActivationDelay('video')).toBe(280);
  });

  it('limits active previews according to pointer mode', () => {
    expect(getPreviewActiveLimit(false)).toBe(2);
    expect(getPreviewActiveLimit(true)).toBe(1);
  });

  it('clamps invalid or excessive preview durations', () => {
    expect(normalizePreviewDuration(undefined)).toBe(3600);
    expect(normalizePreviewDuration(800)).toBe(1600);
    expect(normalizePreviewDuration(9000)).toBe(6000);
    expect(normalizePreviewDuration('3800')).toBe(3800);
  });
});
