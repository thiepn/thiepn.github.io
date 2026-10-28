import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Sparkles,
  Zap,
  Target,
  PenTool,
  Share2,
  FolderTree,
  Sun,
  ShieldCheck,
  Crown,
  CheckCircle2,
  Lock,
  ChevronRight,
  Award,
  Layers,
  BookOpen,
  Calendar,
  Globe,
  Compass,
  Network,
  Gem,
  Cpu,
} from 'lucide-react';
import {
  gamificationEngine,
} from './gamificationEngine';
import {
  SkillBranchId,
  SkillNode,
  Quest,
  AchievementBadge,
  UserProgress,
} from './gamificationTypes';
import { soundscapeService } from '../../utils/soundscapes';

const BRANCH_CONFIG: Record<
  SkillBranchId,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  writing: {
    label: 'Writing & Flow',
    icon: <PenTool className="w-4 h-4 text-amber-400" />,
    color: 'text-amber-400',
    bg: 'bg-amber-950/20',
    border: 'border-amber-500/30',
  },
  linking: {
    label: 'Linking & Synthesis',
    icon: <Share2 className="w-4 h-4 text-purple-400" />,
    color: 'text-purple-400',
    bg: 'bg-purple-950/20',
    border: 'border-purple-500/30',
  },
  recall: {
    label: 'Recall & Memory',
    icon: <Target className="w-4 h-4 text-rose-400" />,
    color: 'text-rose-400',
    bg: 'bg-rose-950/20',
    border: 'border-rose-500/30',
  },
  structure: {
    label: 'Structure & Hygiene',
    icon: <FolderTree className="w-4 h-4 text-blue-400" />,
    color: 'text-blue-400',
    bg: 'bg-blue-950/20',
    border: 'border-blue-500/30',
  },
  consistency: {
    label: 'Consistency & Rituals',
    icon: <Sun className="w-4 h-4 text-emerald-400" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-500/30',
  },
};

export const GamificationHubWorkspaceView: React.FC = () => {
  const [progress, setProgress] = useState<UserProgress>(() => gamificationEngine.getProgress());
  const [activeTab, setActiveTab] = useState<'tree' | 'quests' | 'badges' | 'stats'>('tree');
  const [selectedBranch, setSelectedBranch] = useState<SkillBranchId>('writing');
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);

  useEffect(() => {
    return gamificationEngine.subscribe(() => {
      setProgress(gamificationEngine.getProgress());
    });
  }, []);

  const allNodes = gamificationEngine.getSkillNodes();
  const allQuests = gamificationEngine.getQuests();
  const allBadges = gamificationEngine.getBadges();

  const branchNodes = allNodes.filter((n) => n.branch === selectedBranch);

  const handleUnlockNode = (node: SkillNode) => {
    const success = gamificationEngine.unlockSkillNode(node.id);
    if (success) {
      soundscapeService.playCompletionChime();
      setSelectedNode(node);
    }
  };

  const handleClaimQuest = (questId: string) => {
    const success = gamificationEngine.claimQuest(questId);
    if (success) {
      soundscapeService.playCompletionChime();
    }
  };

  const xpPercent = Math.min(
    100,
    Math.round((progress.currentXP / Math.max(1, progress.nextLevelXP)) * 100)
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-stone-950 text-stone-100 flex flex-col font-sans select-none">
      {/* 1. Hero Character & Progress HUD Banner */}
      <div className="p-6 border-b border-stone-800 bg-stone-900/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Identity & Rank */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-stone-400">
                <span>Level {progress.level}</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-bold">{progress.rankTitle}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
                Knowledge Quests & Mastery
              </h1>
              <p className="text-xs text-stone-400 mt-1">
                Level up your second brain by writing notes, creating links, and training memory.
              </p>
            </div>
          </div>

          {/* Metrics Trio */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Streak Flame */}
            <div className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-stone-400 uppercase">Streak</div>
                <div className="text-sm font-bold text-white flex items-center gap-1">
                  <span>{progress.streakCount} days</span>
                  {progress.streakFreezes > 0 && (
                    <span className="text-[10px] text-cyan-400 font-normal">
                      ({progress.streakFreezes} freeze)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Skill Points Ready */}
            <div className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-stone-400 uppercase">Skill Points</div>
                <div className="text-sm font-bold text-white">
                  {progress.skillPoints}{' '}
                  <span className="text-xs text-stone-500 font-normal">pts available</span>
                </div>
              </div>
            </div>

            {/* Total XP */}
            <div className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-stone-400 uppercase">Total XP</div>
                <div className="text-sm font-bold text-white">
                  {progress.totalXP.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="max-w-6xl mx-auto mt-6">
          <div className="flex items-center justify-between text-xs font-mono text-stone-400 mb-2">
            <span>
              Progress to Level {progress.level + 1}
            </span>
            <span className="tabular-nums">
              {progress.currentXP.toLocaleString()} / {progress.nextLevelXP.toLocaleString()} XP ({xpPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-linear-to-r from-amber-500 via-orange-500 to-purple-500 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="border-b border-stone-800 px-6 bg-stone-950/80 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center gap-2 py-2">
          <button
            onClick={() => setActiveTab('tree')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'tree'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>5-Branch Skill Tree</span>
            {progress.skillPoints > 0 && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('quests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'quests'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Quests ({allQuests.filter((q) => q.completed && !q.claimed).length} claimable)</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'badges'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Trophy Showcase ({progress.unlockedBadgeIds.length}/{allBadges.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'stats'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Vault Stats</span>
          </button>
        </div>
      </div>

      {/* 3. Tab Views */}
      <div className="flex-1 max-w-6xl mx-auto w-full p-6">
        {/* TAB 1: 5-BRANCH SKILL TREE */}
        {activeTab === 'tree' && (
          <div className="space-y-6">
            {/* Branch Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(BRANCH_CONFIG) as SkillBranchId[]).map((branchKey) => {
                const conf = BRANCH_CONFIG[branchKey];
                const isSelected = selectedBranch === branchKey;
                const unlockedInBranch = allNodes.filter(
                  (n) => n.branch === branchKey && progress.unlockedNodeIds.includes(n.id)
                ).length;

                return (
                  <button
                    key={branchKey}
                    onClick={() => {
                      setSelectedBranch(branchKey);
                      setSelectedNode(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${conf.bg} ${conf.border} ring-1 ring-amber-500/50 shadow-md`
                        : 'bg-stone-900/40 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {conf.icon}
                      <span className="text-[10px] font-mono text-stone-400">
                        {unlockedInBranch}/5
                      </span>
                    </div>
                    <div className="text-xs font-bold text-stone-200 truncate">{conf.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Tree Branch Visual Path */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Nodes Column */}
              <div className="md:col-span-2 space-y-3">
                <div className="text-xs font-mono uppercase text-stone-400 pb-1 border-b border-stone-800 flex items-center justify-between">
                  <span>{BRANCH_CONFIG[selectedBranch].label} Progression</span>
                  <span>5 Mastery Tiers</span>
                </div>

                {branchNodes.map((node) => {
                  const isUnlocked = progress.unlockedNodeIds.includes(node.id);
                  const prereqsMet = node.prerequisites.every((p) =>
                    progress.unlockedNodeIds.includes(p)
                  );
                  const canUnlock = !isUnlocked && prereqsMet && progress.skillPoints >= 1;
                  const isSelected = selectedNode?.id === node.id;

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-950/20'
                          : isUnlocked
                          ? 'border-stone-800 bg-stone-900/60 hover:bg-stone-900'
                          : canUnlock
                          ? 'border-purple-500/40 bg-purple-950/10 hover:border-purple-500'
                          : 'border-stone-850 bg-stone-950/40 opacity-50'
                      }`}
                    >
                      {/* Node Icon Status */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isUnlocked
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : canUnlock
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-400 animate-pulse'
                            : 'bg-stone-900 border-stone-800 text-stone-600'
                        }`}
                      >
                        {isUnlocked ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-400" />
                        ) : canUnlock ? (
                          <Zap className="w-5 h-5" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-stone-400">
                            Tier {node.tier}
                          </span>
                          <span aria-hidden="true" className="text-stone-600">·</span>
                          <h4 className="text-sm font-bold text-white truncate">{node.title}</h4>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">
                          {node.description}
                        </p>
                        <div className="text-[11px] text-amber-400/90 font-medium mt-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span>Perk: {node.perkEffect}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 self-center">
                        {isUnlocked ? (
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            Unlocked
                          </span>
                        ) : canUnlock ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlockNode(node);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            Unlock (1 pt)
                          </button>
                        ) : (
                          <span className="text-xs font-mono text-stone-600">Locked</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Node Inspector Sidebar */}
              <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex flex-col h-fit">
                <div className="text-xs font-mono uppercase text-stone-400 mb-3 pb-2 border-b border-stone-800">
                  Node Inspector
                </div>

                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-amber-500">
                        Tier {selectedNode.tier} Perk
                      </div>
                      <h3 className="text-lg font-bold text-white">{selectedNode.title}</h3>
                      <p className="text-xs text-stone-300 mt-1">{selectedNode.description}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                      <div className="text-[10px] font-mono text-stone-500 uppercase">Active Bonus</div>
                      <div className="text-xs font-medium text-amber-300">
                        {selectedNode.perkEffect}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-stone-500 uppercase mb-1">
                        Prerequisites
                      </div>
                      {selectedNode.prerequisites.length === 0 ? (
                        <div className="text-xs text-stone-400">None (Foundation Node)</div>
                      ) : (
                        selectedNode.prerequisites.map((pid) => {
                          const pnode = allNodes.find((n) => n.id === pid);
                          const isPunlocked = progress.unlockedNodeIds.includes(pid);
                          return (
                            <div
                              key={pid}
                              className="text-xs flex items-center gap-1.5 text-stone-300 py-0.5"
                            >
                              {isPunlocked ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-stone-500" />
                              )}
                              <span>{pnode?.title || pid}</span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {!progress.unlockedNodeIds.includes(selectedNode.id) && (
                      <button
                        disabled={
                          !selectedNode.prerequisites.every((p) =>
                            progress.unlockedNodeIds.includes(p)
                          ) || progress.skillPoints < 1
                        }
                        onClick={() => handleUnlockNode(selectedNode)}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-stone-950 font-bold text-xs transition-colors"
                      >
                        Unlock for 1 Skill Point
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-stone-500">
                    Select a skill node on the left to inspect perks and unlock conditions.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE QUESTS BOARD */}
        {activeTab === 'quests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Active Knowledge Quests
              </h3>
              <span className="text-xs text-stone-400">
                Complete real note-taking tasks to earn XP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allQuests.map((quest) => {
                const percent = Math.min(
                  100,
                  Math.round((quest.currentProgress / quest.targetCount) * 100)
                );

                return (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      quest.claimed
                        ? 'bg-stone-900/30 border-stone-800/60 opacity-60'
                        : quest.completed
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-xs'
                        : 'bg-stone-900/60 border-stone-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase text-stone-400 mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-bold">
                          {quest.category}
                        </span>
                        <span className="text-amber-400 font-bold">+{quest.rewardXP} XP</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{quest.title}</h4>
                      <p className="text-xs text-stone-400 mt-1">{quest.description}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 mb-1">
                        <span>Progress</span>
                        <span className="tabular-nums">
                          {quest.currentProgress} / {quest.targetCount} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            quest.completed ? 'bg-emerald-400' : 'bg-amber-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        {quest.claimed ? (
                          <span className="text-xs font-mono text-stone-500 font-bold">Claimed</span>
                        ) : quest.completed ? (
                          <button
                            onClick={() => handleClaimQuest(quest.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Claim {quest.rewardXP} XP</span>
                          </button>
                        ) : (
                          <span className="text-xs font-mono text-stone-400">In Progress</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TROPHY SHOWCASE */}
        {activeTab === 'badges' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Achievement Badges
              </h3>
              <span className="text-xs text-stone-400">
                Unlocked: {progress.unlockedBadgeIds.length} of {allBadges.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {allBadges.map((badge) => {
                const isUnlocked = Boolean(badge.unlockedAt);

                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                      isUnlocked
                        ? 'bg-stone-900 border-amber-500/40 shadow-xs'
                        : 'bg-stone-900/30 border-stone-800/60 opacity-50'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        isUnlocked
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-stone-850 border-stone-800 text-stone-600'
                      }`}
                    >
                      <Trophy className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                          {badge.rarity}
                        </span>
                        {isUnlocked && (
                          <span className="text-[10px] font-mono text-stone-500">
                            {badge.unlockedAt}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{badge.name}</h4>
                      <p className="text-xs text-stone-400 mt-0.5">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: VAULT STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Knowledge Production Metrics
              </h3>
              <span className="text-xs text-stone-400">Cumulative Lifetime Vault Telemetry</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-[10px] font-mono text-stone-400 uppercase">Notes Authored</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {progress.stats.totalNotesCreated.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-[10px] font-mono text-stone-400 uppercase">Words Penned</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {progress.stats.totalWordsWritten.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-[10px] font-mono text-stone-400 uppercase">Wiki-Links Forged</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {progress.stats.totalLinksCreated.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-[10px] font-mono text-stone-400 uppercase">SRS Cards Reviewed</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {progress.stats.totalCardsReviewed.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-[10px] font-mono text-stone-400 uppercase">Daily Reflections</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {progress.stats.totalDailyNotesCompleted.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-[10px] font-mono text-stone-400 uppercase">Best Active Streak</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {progress.bestStreak} days
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
