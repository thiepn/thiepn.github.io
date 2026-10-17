// Secure client-side Web Crypto utilities for note locking and passcode verification

export async function hashPasscode(passcode: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode.trim() + '_keepnotes_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  if (!hash) return true;
  const computed = await hashPasscode(passcode);
  return computed === hash;
}

// In-memory session store of unlocked note IDs (cleared on page reload for security)
const unlockedNotesSession = new Set<string>();

export function isNoteUnlockedInSession(noteId: string): boolean {
  return unlockedNotesSession.has(noteId);
}

export function unlockNoteInSession(noteId: string): void {
  unlockedNotesSession.add(noteId);
}

export function lockNoteInSession(noteId: string): void {
  unlockedNotesSession.delete(noteId);
}

export function lockAllNotesInSession(): void {
  unlockedNotesSession.clear();
}
