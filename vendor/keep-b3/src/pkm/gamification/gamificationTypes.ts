export type SkillBranchId = 'writing' | 'linking' | 'recall' | 'structure' | 'consistency';

export interface SkillNode {
  id: string;
  branch: SkillBranchId;
  tier: number; // 1 to 5
  title: string;
  description: string;
  costXP: number;
  prerequisites: string[]; // parent node IDs
  iconName: string;
  perkEffect: string;
  statBonus?: {
    type: 'xp_boost' | 'streak_shield' | 'search_speed' | 'flashcard_bonus' | 'link_depth';
    value: number; // e.g. 10 for +10%
  };
}

export type QuestCategory = 'daily' | 'weekly' | 'milestone';

export interface Quest {
  id: string;
  category: QuestCategory;
  title: string;
  description: string;
  metric: 'notes_created' | 'words_written' | 'links_created' | 'cards_reviewed' | 'daily_note_written' | 'tags_added';
  targetCount: number;
  currentProgress: number;
  rewardXP: number;
  completed: boolean;
  claimed: boolean;
  expiresAt?: string;
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  category: 'mastery' | 'streak' | 'exploration' | 'architect';
  rarity: BadgeRarity;
  unlockedAt?: string;
  iconName: string;
}

export interface UserProgress {
  level: number;
  currentXP: number;
  totalXP: number;
  nextLevelXP: number;
  rankTitle: string;
  skillPoints: number;
  streakCount: number;
  bestStreak: number;
  lastActiveDate: string | null;
  streakFreezes: number;
  unlockedNodeIds: string[];
  claimedQuestIds: string[];
  unlockedBadgeIds: string[];
  stats: {
    totalNotesCreated: number;
    totalWordsWritten: number;
    totalLinksCreated: number;
    totalCardsReviewed: number;
    totalDailyNotesCompleted: number;
  };
}

export const RANK_TITLES: { minLevel: number; title: string; color: string }[] = [
  { minLevel: 1, title: 'Novice Scribe', color: 'text-stone-400' },
  { minLevel: 3, title: 'Knowledge Apprentice', color: 'text-emerald-400' },
  { minLevel: 5, title: 'Vault Chronicler', color: 'text-blue-400' },
  { minLevel: 8, title: 'Synthesizer', color: 'text-purple-400' },
  { minLevel: 12, title: 'Nexus Architect', color: 'text-amber-400' },
  { minLevel: 16, title: 'Arch-Sage of Knowledge', color: 'text-rose-400' },
  { minLevel: 20, title: 'Grand Archivist', color: 'text-yellow-400' },
];

export const INITIAL_SKILL_TREE: SkillNode[] = [
  // 1. Writing Branch
  {
    id: 'w1',
    branch: 'writing',
    tier: 1,
    title: 'Atomic Clarity',
    description: 'Learn to capture single atomic thoughts cleanly.',
    costXP: 100,
    prerequisites: [],
    iconName: 'PenTool',
    perkEffect: '+10% XP for notes with over 150 words',
    statBonus: { type: 'xp_boost', value: 10 },
  },
  {
    id: 'w2',
    branch: 'writing',
    tier: 2,
    title: 'Flow State Scribe',
    description: 'Unlock rapid capture velocity and sprint pacing.',
    costXP: 250,
    prerequisites: ['w1'],
    iconName: 'Flame',
    perkEffect: 'Writing sprints generate double bonus XP',
    statBonus: { type: 'xp_boost', value: 20 },
  },
  {
    id: 'w3',
    branch: 'writing',
    tier: 3,
    title: 'Deep Synthesis',
    description: 'Condense long thoughts into concise executive abstracts.',
    costXP: 500,
    prerequisites: ['w2'],
    iconName: 'Sparkles',
    perkEffect: 'Unlocks Executive Summary generation prompt perk',
  },
  {
    id: 'w4',
    branch: 'writing',
    tier: 4,
    title: 'Polymath Volume',
    description: 'Write extensive long-form essays across disciplines.',
    costXP: 800,
    prerequisites: ['w3'],
    iconName: 'BookOpen',
    perkEffect: '+25% XP reward on notes exceeding 1,000 words',
  },
  {
    id: 'w5',
    branch: 'writing',
    tier: 5,
    title: 'Grand Lexicon',
    description: 'Mastery of language and personal knowledge articulation.',
    costXP: 1200,
    prerequisites: ['w4'],
    iconName: 'Crown',
    perkEffect: 'Permanent 15% overall XP boost to all writing tasks',
  },

  // 2. Linking Branch
  {
    id: 'l1',
    branch: 'linking',
    tier: 1,
    title: 'Synaptic Spark',
    description: 'Create bidirectional links between related thoughts.',
    costXP: 100,
    prerequisites: [],
    iconName: 'GitFork',
    perkEffect: 'Earn 15 XP for every wiki-link created',
  },
  {
    id: 'l2',
    branch: 'linking',
    tier: 2,
    title: 'Bridge Builder',
    description: 'Connect disparate topic clusters into cohesive graphs.',
    costXP: 250,
    prerequisites: ['l1'],
    iconName: 'Share2',
    perkEffect: '+20% XP when connecting notes from different folders',
  },
  {
    id: 'l3',
    branch: 'linking',
    tier: 3,
    title: 'Map of Content',
    description: 'Construct structural index notes that anchor knowledge.',
    costXP: 500,
    prerequisites: ['l2'],
    iconName: 'Network',
    perkEffect: 'Index notes with 10+ links grant 150 bonus XP',
  },
  {
    id: 'l4',
    branch: 'linking',
    tier: 4,
    title: 'Serendipity Matrix',
    description: 'Resurface dormant notes and connect distant analogies.',
    costXP: 800,
    prerequisites: ['l3'],
    iconName: 'Compass',
    perkEffect: 'Serendipity explorer suggestions grant double rewards',
  },
  {
    id: 'l5',
    branch: 'linking',
    tier: 5,
    title: 'Total Interconnectedness',
    description: 'A frictionless web of human intellect and recall.',
    costXP: 1200,
    prerequisites: ['l4'],
    iconName: 'Globe',
    perkEffect: 'Knowledge graph density multiplier: +30% XP per link',
  },

  // 3. Recall Branch
  {
    id: 'r1',
    branch: 'recall',
    tier: 1,
    title: 'Active Testing',
    description: 'Convert key points into flashcard prompts.',
    costXP: 100,
    prerequisites: [],
    iconName: 'Target',
    perkEffect: 'Earn 10 XP per flashcard reviewed with FSRS spaced repetition',
  },
  {
    id: 'r2',
    branch: 'recall',
    tier: 2,
    title: 'Cloze Crafting',
    description: 'Hide crucial concepts inside context sentences.',
    costXP: 250,
    prerequisites: ['r1'],
    iconName: 'EyeOff',
    perkEffect: '+25% XP bonus for successfully recalled difficult cards',
  },
  {
    id: 'r3',
    branch: 'recall',
    tier: 3,
    title: 'Spaced Mastery',
    description: 'Achieve uninterrupted retention over extended weeks.',
    costXP: 500,
    prerequisites: ['r2'],
    iconName: 'Layers',
    perkEffect: 'Streak preservation shield for SRS review sessions',
  },
  {
    id: 'r4',
    branch: 'recall',
    tier: 4,
    title: 'Feynman Articulation',
    description: 'Explain complex topics in elementary language.',
    costXP: 800,
    prerequisites: ['r3'],
    iconName: 'MessageSquare',
    perkEffect: 'Feynman study studio reviews yield double mastery score',
  },
  {
    id: 'r5',
    branch: 'recall',
    tier: 5,
    title: 'Photographic Engram',
    description: 'Zero forgetting index across core mental models.',
    costXP: 1200,
    prerequisites: ['r4'],
    iconName: 'Cpu',
    perkEffect: 'All flashcard reviews grant +50% XP permanently',
  },

  // 4. Structure Branch
  {
    id: 's1',
    branch: 'structure',
    tier: 1,
    title: 'Taxonomic Order',
    description: 'Adopt consistent tagging and folder naming hygiene.',
    costXP: 100,
    prerequisites: [],
    iconName: 'FolderTree',
    perkEffect: 'Earn 25 XP for organizing unclassified notes into folders',
  },
  {
    id: 's2',
    branch: 'structure',
    tier: 2,
    title: 'Outline Architect',
    description: 'Structure deep notes using hierarchical headings.',
    costXP: 250,
    prerequisites: ['s1'],
    iconName: 'AlignLeft',
    perkEffect: 'Notes with clean H1/H2/H3 outlines receive +15% XP',
  },
  {
    id: 's3',
    branch: 'structure',
    tier: 3,
    title: 'Metadata Mastery',
    description: 'Enrich notes with custom frontmatter and properties.',
    costXP: 500,
    prerequisites: ['s2'],
    iconName: 'Tags',
    perkEffect: 'Frontmatter-enabled notes unlock enhanced database views',
  },
  {
    id: 's4',
    branch: 'structure',
    tier: 4,
    title: 'Vault Sanitation',
    description: 'Eliminate dead links, orphan notes, and clutter.',
    costXP: 800,
    prerequisites: ['s3'],
    iconName: 'ShieldCheck',
    perkEffect: 'Vault Health Doctor sweeps grant 100 XP per healed link',
  },
  {
    id: 's5',
    branch: 'structure',
    tier: 5,
    title: 'Crystalline Hierarchy',
    description: 'A spotless, resilient personal information architecture.',
    costXP: 1200,
    prerequisites: ['s4'],
    iconName: 'Gem',
    perkEffect: 'Vault health score above 90% grants permanent +20% XP boost',
  },

  // 5. Consistency Branch
  {
    id: 'c1',
    branch: 'consistency',
    tier: 1,
    title: 'Daily Dawn Ritual',
    description: 'Open and log morning reflections every single day.',
    costXP: 100,
    prerequisites: [],
    iconName: 'Sun',
    perkEffect: 'Daily Note entries grant 50 XP upon first morning entry',
  },
  {
    id: 'c2',
    branch: 'consistency',
    tier: 2,
    title: 'Unbroken Flame',
    description: 'Maintain a 7-day streak without missing a day.',
    costXP: 250,
    prerequisites: ['c1'],
    iconName: 'Zap',
    perkEffect: 'Unlocks 1 free emergency Streak Freeze per week',
  },
  {
    id: 'c3',
    branch: 'consistency',
    tier: 3,
    title: 'Habit Fortress',
    description: 'Track routines and habit completions systematically.',
    costXP: 500,
    prerequisites: ['c2'],
    iconName: 'CheckCircle2',
    perkEffect: 'Routine item completions award 10 XP each',
  },
  {
    id: 'c4',
    branch: 'consistency',
    tier: 4,
    title: 'Monthly Cadence',
    description: 'Perform recurring weekly and monthly reflective reviews.',
    costXP: 800,
    prerequisites: ['c3'],
    iconName: 'Calendar',
    perkEffect: 'Completing Weekly Reviews yields 300 bonus XP',
  },
  {
    id: 'c5',
    branch: 'consistency',
    tier: 5,
    title: 'Iron Discipline',
    description: 'Lifelong habit of compound learning and reflection.',
    costXP: 1200,
    prerequisites: ['c4'],
    iconName: 'ShieldAlert',
    perkEffect: 'Streaks beyond 30 days multiply all XP gains by 1.5x',
  },
];

export const INITIAL_BADGES: AchievementBadge[] = [
  {
    id: 'b_first_spark',
    name: 'First Spark',
    description: 'Created your very first note in the vault',
    category: 'exploration',
    rarity: 'common',
    iconName: 'Sparkles',
  },
  {
    id: 'b_hyperlink',
    name: 'Synapse Formed',
    description: 'Connected two thoughts with a bidirectional wiki-link',
    category: 'exploration',
    rarity: 'common',
    iconName: 'Link2',
  },
  {
    id: 'b_streak_7',
    name: 'Week of Wisdom',
    description: 'Maintained a 7-day writing streak',
    category: 'streak',
    rarity: 'rare',
    iconName: 'Flame',
  },
  {
    id: 'b_srs_master',
    name: 'Spaced Recall Pioneer',
    description: 'Reviewed 50 flashcards using active recall',
    category: 'mastery',
    rarity: 'rare',
    iconName: 'Target',
  },
  {
    id: 'b_words_10k',
    name: 'Prolific Scribe',
    description: 'Penned over 10,000 words across your personal vault',
    category: 'mastery',
    rarity: 'epic',
    iconName: 'BookMarked',
  },
  {
    id: 'b_vault_doctor',
    name: 'Sanitary Vault',
    description: 'Achieved a 100% Vault Health rating with zero broken links',
    category: 'architect',
    rarity: 'epic',
    iconName: 'ShieldCheck',
  },
  {
    id: 'b_grand_archivist',
    name: 'Grand Archivist',
    description: 'Unlocked 15 nodes on the Knowledge Skill Tree and reached Level 20',
    category: 'mastery',
    rarity: 'legendary',
    iconName: 'Crown',
  },
];
