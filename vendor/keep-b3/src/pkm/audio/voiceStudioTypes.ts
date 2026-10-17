export interface AudioBookmark {
  id: string;
  timestampSeconds: number; // e.g. 75
  label: string;
}

export type VoiceMemoCategory = 'idea' | 'meeting' | 'lecture' | 'brainstorm' | 'journal';

export interface VoiceMemo {
  id: string;
  title: string;
  durationSeconds: number;
  recordedAt: string; // ISO
  audioDataUrl?: string; // base64 or blob url
  transcript: string;
  bookmarks: AudioBookmark[];
  category: VoiceMemoCategory;
  tags: string[];
}

export const VOICE_MEMO_STORAGE_KEY = 'pkm_voice_memos_v1';

/**
 * Formats a duration in seconds to standard MM:SS display
 */
export function formatAudioSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Generates structured markdown note content for a voice memo
 */
export function generateVoiceNoteMarkdown(memo: VoiceMemo): string {
  const dateStr = new Date(memo.recordedAt).toLocaleString();
  let md = `# 🎙️ ${memo.title}\n\n`;
  md += `* **Recorded:** ${dateStr}\n`;
  md += `* **Duration:** ${formatAudioSeconds(memo.durationSeconds)}\n`;
  md += `* **Category:** ${memo.category}\n`;
  if (memo.tags.length > 0) {
    md += `* **Tags:** ${memo.tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}\n`;
  }
  md += `\n---\n\n`;

  if (memo.bookmarks.length > 0) {
    md += `### ⏱️ Key Timestamp Moments\n`;
    memo.bookmarks.forEach((bm) => {
      md += `- **[${formatAudioSeconds(bm.timestampSeconds)}]** ${bm.label}\n`;
    });
    md += `\n---\n\n`;
  }

  md += `### 📝 Transcript\n\n`;
  md += memo.transcript.trim()
    ? memo.transcript.trim()
    : `*(No speech transcript recorded)*`;
  md += `\n`;

  return md;
}
