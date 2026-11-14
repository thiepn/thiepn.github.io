/**
 * Owner-requested additions without a verified live launch endpoint.
 * These are text-only personal Apps candidates, never public launch records,
 * Core providers, or substitutes for the reviewed manifest.
 */
export const pendingHubApps = [
  { id: 'folio', title: 'Folio', category: 'tools',
    note: 'Deployment target documented; production availability not confirmed.' },
  { id: 'randomizer', title: 'Randomizer Arcade', category: 'tools',
    note: 'Released source exists; canonical browser URL not verified.' },
  { id: 'party', title: 'CHAOS CLUB', category: 'games',
    note: 'Public standalone build described; current launch URL not verified.' },
  { id: 'convert', title: 'THIEPN Convert', category: 'tools',
    note: 'Production-ready source described; live launch URL not verified.' },
] as const;
