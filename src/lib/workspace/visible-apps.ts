/** Owner-approved Hub presentation policy. Not an access-control or launch-registry change. */
export const HUB_VISIBLE_APP_IDS = [
  "notes",
  "canvas",
  "tiny-tools",
  "thiepn-library",
  "manuscript",
  "pdf-studio",
  "wordstrike",
  "the-bible-challenge",
  "duel",
  "tms60",
  "gomoku",
  "artikelwerk",
  "micro-arcade",
  "voidcut"
] as const;
const visibleIds: ReadonlySet<string> = new Set(HUB_VISIBLE_APP_IDS);
export function isHubVisibleApp(id: string): boolean { return visibleIds.has(id); }
export function visibleHubApps<T extends { id: string }>(apps: readonly T[]): T[] {
  const byId = new Map(apps.map(app => [app.id, app]));
  return HUB_VISIBLE_APP_IDS.flatMap(id => { const app = byId.get(id); return app ? [app] : []; });
}
