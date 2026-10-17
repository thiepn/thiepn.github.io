import { commandRegistry } from '../commands/commandRegistry';
import {
  VoiceMemo,
  AudioBookmark,
  formatAudioSeconds,
  generateVoiceNoteMarkdown,
  VOICE_MEMO_STORAGE_KEY,
} from '../audio/voiceStudioTypes';

export function runFeatureP5VoiceStudioTests(): { passed: number; failed: number; errors: string[] } {
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

  // Gate 1: Command Registration & Discovery
  const cmd = commandRegistry.getCommand('tools:voice-memo-studio');
  assert(Boolean(cmd), 'tools:voice-memo-studio command is registered in commandRegistry');
  assert(Boolean(cmd?.title.includes('Voice Memo')), 'Command title includes "Voice Memo"');
  assert(cmd?.shortcut === 'Alt+V', 'Command shortcut is Alt+V');
  assert(Boolean(cmd?.keywords.includes('transcript')), 'Keywords include transcript');
  assert(Boolean(cmd?.keywords.includes('p5')), 'Keywords include p5');

  // Gate 2: Audio Time Formatter
  assert(formatAudioSeconds(0) === '00:00', 'Formats 0 seconds as 00:00');
  assert(formatAudioSeconds(9) === '00:09', 'Formats 9 seconds as 00:09');
  assert(formatAudioSeconds(65) === '01:05', 'Formats 65 seconds as 01:05');
  assert(formatAudioSeconds(135) === '02:15', 'Formats 135 seconds as 02:15');
  assert(formatAudioSeconds(600) === '10:00', 'Formats 600 seconds as 10:00');

  // Gate 3: Timestamp Bookmarks Structuring
  const bms: AudioBookmark[] = [
    { id: 'bm-1', timestampSeconds: 15, label: 'Introductory hypothesis' },
    { id: 'bm-2', timestampSeconds: 84, label: 'Key counter-argument' },
  ];
  assert(bms.length === 2, 'Initial bookmark count is 2');
  assert(bms[0].timestampSeconds === 15, 'Bookmark 1 at 15s');
  assert(bms[1].timestampSeconds === 84, 'Bookmark 2 at 84s');

  // Gate 4: Voice Note Markdown Formatter
  const mockMemo: VoiceMemo = {
    id: 'memo-123',
    title: 'Distributed Systems & Vector Clocks',
    durationSeconds: 124,
    recordedAt: '2026-10-12T10:00:00Z',
    transcript: 'Vector clocks allow us to determine partial ordering of events in distributed state.',
    bookmarks: bms,
    category: 'lecture',
    tags: ['distributed', 'systems', 'audio'],
  };

  const md = generateVoiceNoteMarkdown(mockMemo);
  assert(md.includes('# 🎙️ Distributed Systems & Vector Clocks'), 'Includes voice note header title');
  assert(md.includes('* **Duration:** 02:04'), 'Includes formatted duration 02:04');
  assert(md.includes('* **Category:** lecture'), 'Includes category');
  assert(md.includes('#distributed #systems #audio'), 'Includes formatted tags');
  assert(md.includes('- **[00:15]** Introductory hypothesis'), 'Includes first timestamp bookmark [00:15]');
  assert(md.includes('- **[01:24]** Key counter-argument'), 'Includes second timestamp bookmark [01:24]');
  assert(md.includes('Vector clocks allow us to determine partial ordering'), 'Includes full transcript body');

  // Gate 5: Storage Key Invariant
  assert(VOICE_MEMO_STORAGE_KEY === 'pkm_voice_memos_v1', 'Uses correct storage key constant');

  return { passed, failed, errors };
}
