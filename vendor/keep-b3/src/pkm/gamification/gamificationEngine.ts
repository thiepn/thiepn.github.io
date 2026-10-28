import {
  UserProgress,
  Quest,
  SkillNode,
  AchievementBadge,
  INITIAL_SKILL_TREE,
  INITIAL_BADGES,
  RANK_TITLES,
  SkillBranchId,
} from './gamificationTypes';

const STORAGE_KEY = 'pkm_gamification_progress';

class GamificationEngine {
  private progress: UserProgress;
  private quests: Quest[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.progress = this.loadProgress();
    this.ensureQuests();
    this.checkStreakOnLaunch();
  }

  private getDefaultProgress(): UserProgress {
    return {
      level: 1,
      currentXP: 0,
      totalXP: 0,
      nextLevelXP: 100,
      rankTitle: 'Novice Scribe',
      skillPoints: 0,
      streakCount: 1,
      bestStreak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      streakFreezes: 1,
      unlockedNodeIds: [],
      claimedQuestIds: [],
      unlockedBadgeIds: [],
      stats: {
        totalNotesCreated: 0,
        totalWordsWritten: 0,
        totalLinksCreated: 0,
        totalCardsReviewed: 0,
        totalDailyNotesCompleted: 0,
      },
    };
  }

  private loadProgress(): UserProgress {
    if (typeof window === 'undefined') return this.getDefaultProgress();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultProgress();
      const parsed = JSON.parse(raw);
      return {
        ...this.getDefaultProgress(),
        ...parsed,
        stats: {
          ...this.getDefaultProgress().stats,
          ...(parsed.stats || {}),
        },
      };
    } catch (e) {
      console.warn('Failed to load gamification progress, resetting', e);
      return this.getDefaultProgress();
    }
  }

  public save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
      this.notify();
    } catch (e) {
      console.error('Failed to save gamification progress', e);
    }
  }

  public getProgress(): UserProgress {
    return { ...this.progress };
  }

  public getSkillNodes(): SkillNode[] {
    return INITIAL_SKILL_TREE;
  }

  public getBadges(): AchievementBadge[] {
    return INITIAL_BADGES.map((b) => ({
      ...b,
      unlockedAt: this.progress.unlockedBadgeIds.includes(b.id)
        ? this.progress.lastActiveDate || 'Unlocked'
        : undefined,
    }));
  }

  public getQuests(): Quest[] {
    return [...this.quests];
  }

  public addXP(amount: number, reason?: string): { leveledUp: boolean; newLevel: number } {
    let leveledUp = false;
    this.progress.currentXP += amount;
    this.progress.totalXP += amount;

    // Check level up threshold
    while (this.progress.currentXP >= this.progress.nextLevelXP) {
      this.progress.currentXP -= this.progress.nextLevelXP;
      this.progress.level += 1;
      this.progress.skillPoints += 1;
      this.progress.nextLevelXP = Math.round(100 * Math.pow(this.progress.level, 1.35));
      leveledUp = true;
    }

    // Update rank title based on level
    const rankMatch = [...RANK_TITLES]
      .reverse()
      .find((r) => this.progress.level >= r.minLevel);
    if (rankMatch) {
      this.progress.rankTitle = rankMatch.title;
    }

    this.checkBadges();
    this.save();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pkm_xp_gained', {
          detail: { amount, reason, level: this.progress.level, leveledUp },
        })
      );
    }

    return { leveledUp, newLevel: this.progress.level };
  }

  public unlockSkillNode(nodeId: string): boolean {
    const node = INITIAL_SKILL_TREE.find((n) => n.id === nodeId);
    if (!node) return false;
    if (this.progress.unlockedNodeIds.includes(nodeId)) return false;

    // Check prerequisites
    const prereqsMet = node.prerequisites.every((p) =>
      this.progress.unlockedNodeIds.includes(p)
    );
    if (!prereqsMet) return false;

    // Check cost (skill points)
    if (this.progress.skillPoints < 1) return false;

    this.progress.skillPoints -= 1;
    this.progress.unlockedNodeIds.push(nodeId);
    this.checkBadges();
    this.save();
    return true;
  }

  public claimQuest(questId: string): boolean {
    const quest = this.quests.find((q) => q.id === questId);
    if (!quest || !quest.completed || quest.claimed) return false;

    quest.claimed = true;
    this.progress.claimedQuestIds.push(questId);
    this.addXP(quest.rewardXP, `Completed Quest: ${quest.title}`);
    this.save();
    return true;
  }

  // Action hooks called from editor & PKM systems
  public recordNoteCreated(noteTitle?: string) {
    this.progress.stats.totalNotesCreated += 1;
    this.advanceQuests('notes_created', 1);
    this.addXP(25, 'Created new note');
    this.checkStreak();
    this.checkBadges();
  }

  public recordWordsWritten(wordCount: number) {
    if (wordCount <= 0) return;
    this.progress.stats.totalWordsWritten += wordCount;
    this.advanceQuests('words_written', wordCount);
    // 1 XP per 20 words written
    const xpBonus = Math.floor(wordCount / 20);
    if (xpBonus > 0) {
      this.addXP(xpBonus, `Wrote ${wordCount} words`);
    }
    this.checkBadges();
  }

  public recordLinkCreated() {
    this.progress.stats.totalLinksCreated += 1;
    this.advanceQuests('links_created', 1);
    this.addXP(15, 'Created wiki-link');
    this.checkBadges();
  }

  public recordCardsReviewed(count: number = 1) {
    this.progress.stats.totalCardsReviewed += count;
    this.advanceQuests('cards_reviewed', count);
    this.addXP(10 * count, `Reviewed ${count} flashcards`);
    this.checkStreak();
    this.checkBadges();
  }

  public recordDailyNoteWritten() {
    this.progress.stats.totalDailyNotesCompleted += 1;
    this.advanceQuests('daily_note_written', 1);
    this.addXP(50, 'Completed daily reflection note');
    this.checkStreak();
    this.checkBadges();
  }

  private advanceQuests(metric: Quest['metric'], amount: number) {
    let changed = false;
    for (const q of this.quests) {
      if (q.metric === metric && !q.completed) {
        q.currentProgress = Math.min(q.targetCount, q.currentProgress + amount);
        if (q.currentProgress >= q.targetCount) {
          q.completed = true;
        }
        changed = true;
      }
    }
    if (changed) this.save();
  }

  private checkStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (this.progress.lastActiveDate === today) return;

    if (!this.progress.lastActiveDate) {
      this.progress.streakCount = 1;
      this.progress.lastActiveDate = today;
    } else {
      const lastDate = new Date(this.progress.lastActiveDate);
      const currDate = new Date(today);
      const diffDays = Math.round(
        (currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        this.progress.streakCount += 1;
        if (this.progress.streakCount > this.progress.bestStreak) {
          this.progress.bestStreak = this.progress.streakCount;
        }
        this.progress.lastActiveDate = today;
      } else if (diffDays > 1) {
        if (this.progress.streakFreezes > 0) {
          this.progress.streakFreezes -= 1;
          this.progress.lastActiveDate = today;
        } else {
          this.progress.streakCount = 1;
          this.progress.lastActiveDate = today;
        }
      }
    }
    this.checkBadges();
    this.save();
  }

  private checkStreakOnLaunch() {
    const today = new Date().toISOString().split('T')[0];
    if (!this.progress.lastActiveDate) {
      this.progress.lastActiveDate = today;
      this.save();
      return;
    }
    const lastDate = new Date(this.progress.lastActiveDate);
    const currDate = new Date(today);
    const diffDays = Math.round(
      (currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 1 && this.progress.streakFreezes === 0) {
      this.progress.streakCount = 1;
      this.save();
    }
  }

  private checkBadges() {
    const unlocked = new Set(this.progress.unlockedBadgeIds);

    if (this.progress.stats.totalNotesCreated >= 1) {
      unlocked.add('b_first_spark');
    }
    if (this.progress.stats.totalLinksCreated >= 1) {
      unlocked.add('b_hyperlink');
    }
    if (this.progress.streakCount >= 7) {
      unlocked.add('b_streak_7');
    }
    if (this.progress.stats.totalCardsReviewed >= 50) {
      unlocked.add('b_srs_master');
    }
    if (this.progress.stats.totalWordsWritten >= 10000) {
      unlocked.add('b_words_10k');
    }
    if (
      this.progress.unlockedNodeIds.length >= 15 &&
      this.progress.level >= 20
    ) {
      unlocked.add('b_grand_archivist');
    }

    if (unlocked.size !== this.progress.unlockedBadgeIds.length) {
      this.progress.unlockedBadgeIds = Array.from(unlocked);
      this.save();
    }
  }

  private ensureQuests() {
    // Generate default quests if empty
    if (this.quests.length === 0) {
      this.quests = [
        {
          id: 'q_daily_note',
          category: 'daily',
          title: 'Daily Dawn Entry',
          description: 'Log thoughts or reflections in today’s Daily Note.',
          metric: 'daily_note_written',
          targetCount: 1,
          currentProgress: 0,
          rewardXP: 60,
          completed: false,
          claimed: false,
        },
        {
          id: 'q_atomic_note',
          category: 'daily',
          title: 'Atomic Scribe',
          description: 'Capture 2 new notes in your knowledge vault.',
          metric: 'notes_created',
          targetCount: 2,
          currentProgress: 0,
          rewardXP: 50,
          completed: false,
          claimed: false,
        },
        {
          id: 'q_link_builder',
          category: 'daily',
          title: 'Synaptic Connection',
          description: 'Create 3 bidirectional [[wiki-links]] between notes.',
          metric: 'links_created',
          targetCount: 3,
          currentProgress: 0,
          rewardXP: 75,
          completed: false,
          claimed: false,
        },
        {
          id: 'q_flashcard_drill',
          category: 'weekly',
          title: 'Memory Fortress',
          description: 'Review 20 spaced repetition flashcards this week.',
          metric: 'cards_reviewed',
          targetCount: 20,
          currentProgress: 0,
          rewardXP: 250,
          completed: false,
          claimed: false,
        },
        {
          id: 'q_word_marathon',
          category: 'weekly',
          title: 'Flow Marathon',
          description: 'Write 1,500 words across all notes this week.',
          metric: 'words_written',
          targetCount: 1500,
          currentProgress: 0,
          rewardXP: 300,
          completed: false,
          claimed: false,
        },
        {
          id: 'q_vault_scale',
          category: 'milestone',
          title: 'Vault Centurion',
          description: 'Build a library of 100 distinct atomic notes.',
          metric: 'notes_created',
          targetCount: 100,
          currentProgress: Math.min(100, this.progress.stats.totalNotesCreated),
          rewardXP: 1000,
          completed: this.progress.stats.totalNotesCreated >= 100,
          claimed: false,
        },
      ];
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in gamification listener', err);
      }
    }
  }
}

export const gamificationEngine = new GamificationEngine();
