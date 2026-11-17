/**
 * Only bounded, user-triggered consent-scoped metadata refresh.
 * This budget never automatically starts a Library session or reads records.
 */
export function createMetadataReadBudget(
  now: () => number = Date.now,
  maxInWindow = 8,
  windowMs = 60_000,
) {
  let attempts: number[] = [];
  return {
    take() {
      const current = now();
      attempts = attempts.filter((t) => current - t >= 0 && current - t < windowMs);
      if (attempts.length >= maxInWindow) return false;
      attempts.push(current);
      return true;
    },
    reset() { attempts = []; },
    remaining() {
      const current = now();
      return Math.max(0, maxInWindow - attempts.filter((t) => current - t >= 0 && current - t < windowMs).length);
    },
  };
}
