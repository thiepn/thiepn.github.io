import {
  gamificationEngine,
  INITIAL_SKILL_TREE,
  INITIAL_BADGES,
  RANK_TITLES,
} from '../gamification';
import { vaultHealthService } from '../diagnostics';
import { VaultArchiveExporter } from '../archive';
import { commandRegistry } from '../commands/commandRegistry';
import { Note, Folder } from '../../types';

export function runFeatureCompletionSuiteTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const err = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(err);
      console.error(err);
    }
  }

  // --- GATE 1: Gamification Engine & XP Progression ---
  const initialProg = gamificationEngine.getProgress();
  assert(initialProg.level >= 1, 'Initial level is at least 1');
  assert(Boolean(initialProg.rankTitle), 'User has a valid initial rank title');

  // Test XP gain and level up
  const initialLevel = initialProg.level;
  const xpResult = gamificationEngine.addXP(500, 'Test XP burst');
  const afterProg = gamificationEngine.getProgress();
  assert(afterProg.totalXP >= 500, 'Total XP incremented correctly');
  assert(afterProg.level >= initialLevel, 'Level maintained or incremented');

  // Verify action tracking hooks
  const preActionStats = { ...gamificationEngine.getProgress().stats };
  gamificationEngine.recordNoteCreated('Sample Note');
  assert(gamificationEngine.getProgress().stats.totalNotesCreated === preActionStats.totalNotesCreated + 1, 'recordNoteCreated increments totalNotesCreated');

  gamificationEngine.recordWordsWritten(100);
  assert(gamificationEngine.getProgress().stats.totalWordsWritten === preActionStats.totalWordsWritten + 100, 'recordWordsWritten increments totalWordsWritten');

  gamificationEngine.recordLinkCreated();
  assert(gamificationEngine.getProgress().stats.totalLinksCreated === preActionStats.totalLinksCreated + 1, 'recordLinkCreated increments totalLinksCreated');

  gamificationEngine.recordCardsReviewed(2);
  assert(gamificationEngine.getProgress().stats.totalCardsReviewed === preActionStats.totalCardsReviewed + 2, 'recordCardsReviewed increments totalCardsReviewed');

  // Verify rank progression scale
  assert(RANK_TITLES.length >= 7, 'At least 7 rank titles defined');
  assert(RANK_TITLES[0].title === 'Novice Scribe', 'Base rank is Novice Scribe');
  assert(RANK_TITLES[RANK_TITLES.length - 1].title === 'Grand Archivist', 'Apex rank is Grand Archivist');

  // --- GATE 2: 5-Branch Skill Tree Structure & Unlocking ---
  assert(INITIAL_SKILL_TREE.length === 25, 'Skill tree contains exactly 25 nodes (5 branches x 5 tiers)');
  const branches = ['writing', 'linking', 'recall', 'structure', 'consistency'];
  branches.forEach((b) => {
    const count = INITIAL_SKILL_TREE.filter((n) => n.branch === b).length;
    assert(count === 5, `Branch "${b}" has exactly 5 tiers`);
  });

  // Verify tier 2 node cannot be unlocked without tier 1
  const w2Node = INITIAL_SKILL_TREE.find((n) => n.id === 'w2');
  assert(Boolean(w2Node), 'Node w2 exists');
  assert(w2Node?.prerequisites.includes('w1'), 'Node w2 requires w1 prerequisite');

  // --- GATE 3: Quests & Achievements ---
  const quests = gamificationEngine.getQuests();
  assert(quests.length >= 5, 'Contains at least 5 active knowledge quests');
  assert(quests.some((q) => q.category === 'daily'), 'Contains daily quests');
  assert(quests.some((q) => q.category === 'weekly'), 'Contains weekly quests');
  assert(quests.some((q) => q.category === 'milestone'), 'Contains milestone quests');

  const badges = gamificationEngine.getBadges();
  assert(badges.length >= 7, 'Contains at least 7 achievement badges');
  assert(badges.some((b) => b.id === 'b_first_spark'), 'First Spark badge exists');
  assert(badges.some((b) => b.id === 'b_grand_archivist'), 'Grand Archivist badge exists');

  // --- GATE 4: Vault Health & Integrity Diagnostics ---
  const mockNotes: Note[] = [
    {
      id: 'n1',
      title: 'Solar System',
      content: 'The planets orbit the sun. See [[Mars Exploration]] and [[Jupiter Moons]].',
      type: 'text',
      checklist: [],
      tags: ['space'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'n2',
      title: 'Mars Exploration',
      content: 'Rovers on Mars. Connects back to [[Solar System]] and [[Missing Technology]].',
      type: 'text',
      checklist: [],
      tags: ['space', 'mars'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'n3',
      title: 'Solitary Idea',
      content: 'A standalone thought with zero connections to anywhere.',
      type: 'text',
      checklist: [],
      tags: ['unlinked'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const report = vaultHealthService.scanVault(mockNotes);
  assert(report.totalNotes === 3, 'Scanned 3 active notes');
  assert(report.brokenLinks.length === 2, 'Detected 2 broken links (Jupiter Moons & Missing Technology)');
  assert(
    report.brokenLinks.some((l) => l.targetTitle === 'Jupiter Moons'),
    'Identified broken link [[Jupiter Moons]]'
  );
  assert(
    report.brokenLinks.some((l) => l.targetTitle === 'Missing Technology'),
    'Identified broken link [[Missing Technology]]'
  );
  assert(report.orphanNotes.length === 1, 'Detected 1 orphan note (Solitary Idea)');
  assert(report.orphanNotes[0].noteTitle === 'Solitary Idea', 'Correct orphan note title');
  assert(report.healthScore < 100, 'Health score reflects link penalties');

  // Test Auto-Heal: create stub note
  const stub = vaultHealthService.createStubNoteForBrokenLink('Jupiter Moons', 'Solar System');
  assert(stub.title === 'Jupiter Moons', 'Stub note has target title');
  assert(stub.tags?.includes('vault-doctor'), 'Stub note has vault-doctor tag');
  assert(Boolean(stub.content?.includes('[[Solar System]]')), 'Stub content back-references source');

  // Test Auto-Heal: unlink broken link
  const originalContent = 'Orbiting [[Jupiter Moons]] with probes.';
  const healed = vaultHealthService.healBrokenLinkInContent(originalContent, 'Jupiter Moons');
  assert(healed === 'Orbiting Jupiter Moons with probes.', 'Healed content stripped wiki-link brackets cleanly');

  // --- GATE 5: Standalone Vault Archive Exporter ---
  const mockFolders: Folder[] = [{ id: 'f1', name: 'Astronomy' }];
  const manifest = VaultArchiveExporter.createManifest(mockNotes, mockFolders, 'Cosmos Vault');
  assert(manifest.totalNotes === 3, 'Manifest captures 3 notes');
  assert(manifest.totalFolders === 1, 'Manifest captures 1 folder');
  assert(manifest.vaultName === 'Cosmos Vault', 'Manifest preserves vault name');

  const standaloneHTML = VaultArchiveExporter.generateStandaloneHTML(manifest);
  assert(Boolean(standaloneHTML.includes('<!DOCTYPE html>')), 'Generates valid HTML doctype');
  assert(Boolean(standaloneHTML.includes('Cosmos Vault')), 'Embedded vault title in HTML archive');
  assert(Boolean(standaloneHTML.includes('filterNotes()')), 'HTML archive contains embedded instant search');
  assert(Boolean(standaloneHTML.includes('Solar System')), 'HTML archive embeds note content in payload');

  // --- GATE 6: Command Registry Integration ---
  const gameCmd = commandRegistry.getCommand('tools:gamification-hub');
  assert(Boolean(gameCmd), 'tools:gamification-hub command registered');
  assert(gameCmd?.shortcut === 'Alt+Shift+G', 'Gamification Hub shortcut is Alt+Shift+G');

  const docCmd = commandRegistry.getCommand('tools:vault-health-doctor');
  assert(Boolean(docCmd), 'tools:vault-health-doctor command registered');
  assert(docCmd?.shortcut === 'Alt+Shift+H', 'Vault Doctor shortcut is Alt+Shift+H');

  const archCmd = commandRegistry.getCommand('tools:vault-archive-exporter');
  assert(Boolean(archCmd), 'tools:vault-archive-exporter command registered');
  assert(archCmd?.shortcut === 'Alt+Shift+E', 'Archive Exporter shortcut is Alt+Shift+E');

  return { passed, failed, errors };
}
