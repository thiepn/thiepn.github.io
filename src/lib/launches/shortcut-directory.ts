/**
 * Opt-in shortcuts for independently owned apps absent from the frozen Core
 * launch manifest. These are navigation targets, NOT proof of production
 * readiness, integration grants, provider access, or public catalogue entries.
 *
 * A checked-in allowlist is deliberate: never infer publishable apps from all
 * GitHub repositories, private Core metadata, or draft deployments.
 */
import type manifest from '../../generated/launch-manifest.json';

type Category = (typeof manifest.entries)[number]['category'];
export interface ShortcutLaunch {
  id: string;
  title: string;
  url: string;
  category: Category;
  ownerRepo: string;
  description: string;
  badge: null;
  aliases: string[];
  moduleRef: null;
  visibility: 'shortcut-only';
  state: 'candidate';
  platforms: string[];
  contentSlug: null;
  keywords: string[];
}

function shortcut(id: string, title: string, url: string, category: Category, ownerRepo: string): ShortcutLaunch {
  return {
    id, title, url, category, ownerRepo,
    description: '', badge: null, aliases: [], moduleRef: null,
    visibility: 'shortcut-only', state: 'candidate',
    platforms: ['desktop', 'tablet', 'mobile'],
    contentSlug: null, keywords: [],
  };
}

// Only owner-established or repository-documented canonical app entrypoints.
// Do not add a proposed hostname, preview build, private dashboard or a
// not-yet-published application here.
export const additionalShortcutLaunches: readonly ShortcutLaunch[] = [
  shortcut('languages', 'Languages', 'https://languages.thiepn.dev/', 'learn', 'thiepn/languages'),
  shortcut('chinese', 'Chinese', 'https://chinese.thiepn.dev/', 'learn', 'thiepn/chinese'),
  shortcut('japanese', 'Japanese', 'https://japanese.thiepn.dev/', 'learn', 'thiepn/japanese'),
  shortcut('studyos', 'StudyOS', 'https://study.thiepn.dev/', 'learn', 'thiepn/studyOS'),
  shortcut('mdd', 'My Daily Devotion', 'https://mdd.thiepn.dev/', 'faith', 'thiepn/my-daily-devotion'),
  shortcut('selah', 'Selah', 'https://thiepn.dev/selah/', 'faith', 'thiepn/selah'),
  shortcut('korea', 'KOREA', 'https://korea.thiepn.dev/', 'learn', 'thiepn/korea'),
  shortcut('chess', 'Chess', 'https://chess.thiepn.dev/', 'games', 'thiepn/chess'),
  shortcut('karaoke', 'ROOMTONE Karaoke', 'https://karaoke.thiepn.dev/', 'create', 'thiepn/karaoke'),
  shortcut('ion', 'ION', 'https://ion.thiepn.dev/', 'games', 'thiepn/ion'),
  shortcut('ligoquiz', 'LiGoQuiz', 'https://thiepn.dev/ligoquiz/', 'games', 'thiepn/ligoquiz'),
  shortcut('control', 'Control', 'https://control.thiepn.dev/', 'tools', 'thiepn/control'),
];

/** Prioritize actively used apps without altering old IDs or saved pins. */
export const primaryShortcutIds: readonly string[] = [
  'languages', 'french-3000', 'chinese', 'japanese', 'korea', 'studyos',
  'mdd', 'selah', 'tms60', 'thiepn-library',
  'ion', 'chess', 'ligoquiz', 'karaoke', 'gomoku', 'control', 'tiny-tools',
];

/** Keep any already pinned apps at the top, then current options, then the rest. */
export function partitionShortcutChoices<T extends { id: string }>(
  choices: readonly T[],
  selectedIds: readonly string[],
): { pinned: T[]; primary: T[]; other: T[] } {
  const byId = new Map(choices.map(choice => [choice.id, choice]));
  const used = new Set<string>();
  const take = (ids: readonly string[]) => ids.flatMap(id => {
    const choice = byId.get(id);
    if (!choice || used.has(id)) return [];
    used.add(id);
    return [choice];
  });
  const pinned = take(selectedIds);
  const primary = take(primaryShortcutIds);
  return { pinned, primary, other: choices.filter(choice => !used.has(choice.id)) };
}
