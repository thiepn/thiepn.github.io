import { backupScopeKey, createHabitsBackup, readHabitsBackup, type HabitsBackupScope } from '../lib/prism/habits-backup';
import type { HabitsV0Document } from '../lib/prism/habits-v0';

interface Current {
  doc: HabitsV0Document;
  scope: HabitsBackupScope;
}
interface Connection {
  getActive(): Current | null;
  replaceDocument(next: HabitsV0Document): boolean;
}

export function mountHabitsPortability(panel: HTMLElement, port: Connection) {
  const area = panel.querySelector<HTMLElement>('[data-habits-portability]')!;
  const exportButton = area.querySelector<HTMLButtonElement>('[data-habits-export]')!;
  const fileInput = area.querySelector<HTMLInputElement>('[data-habits-import]')!;
  const review = area.querySelector<HTMLElement>('[data-habits-import-review]')!;
  const summary = area.querySelector<HTMLElement>('[data-habits-import-summary]')!;
  const status = area.querySelector<HTMLElement>('[data-habits-portability-status]')!;
  const confirm = area.querySelector<HTMLButtonElement>('[data-habits-import-confirm]')!;
  const cancel = area.querySelector<HTMLButtonElement>('[data-habits-import-cancel]')!;
  let epoch = 0;
  let staged: { scopeKey: string; doc: HabitsV0Document } | null = null;
  function reset() {
    epoch++;
    staged = null;
    review.hidden = true;
    summary.textContent = '';
    fileInput.value = '';
  }

  exportButton.addEventListener('click', () => {
    const current = port.getActive();
    if (!current) { status.textContent = 'Verify the current session before exporting.'; return; }
    try {
      const json = createHabitsBackup(current.doc, current.scope);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'thiepn-habits-' + new Date().toISOString().slice(0, 10) + '.json';
      link.hidden = true;
      area.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      status.textContent = 'Backup download requested. Keep the downloaded file private.';
    } catch {
      status.textContent = 'Backup could not be created. Existing data unchanged.';
    }
  });

  fileInput.addEventListener('change', () => void (async () => {
    const seq = ++epoch;
    staged = null;
    review.hidden = true;
    const file = fileInput.files?.[0];
    const active = port.getActive();
    const scopeKey = active && backupScopeKey(active.scope);
    if (!active || !scopeKey || !file) { status.textContent = 'Select a file after session verification.'; return; }
    if (file.size > 500_000) {
      status.textContent = 'File exceeds 500 KB.';
      fileInput.value = '';
      return;
    }
    try {
      const raw = await file.text();
      const fresh = port.getActive();
      if (seq !== epoch || !fresh || backupScopeKey(fresh.scope) !== scopeKey) return;
      const result = readHabitsBackup(raw, active.scope);
      if (!result.ok) { status.textContent = result.reason + ' Nothing was changed.'; return; }
      const total = Object.values(result.backup.habits.dates).reduce((n, days) => n + days.length, 0);
      staged = { scopeKey, doc: result.backup.habits };
      summary.textContent = 'Backup dated ' + result.backup.exportedAt.slice(0, 10) +
        ': ' + total + ' self-reported check-ins. No data has been replaced yet.';
      review.hidden = false;
      status.textContent = 'Valid backup staged. Explicit confirmation is required.';
    } catch {
      status.textContent = 'File could not be read. Nothing was changed.';
    } finally {
      fileInput.value = '';
    }
  })());

  confirm.addEventListener('click', () => {
    const current = port.getActive();
    if (!staged || !current || backupScopeKey(current.scope) !== staged.scopeKey) {
      reset();
      status.textContent = 'Session changed. Select the backup again.';
      return;
    }
    if (!port.replaceDocument(staged.doc)) {
      status.textContent = 'Import failed to persist. No successful restore is claimed.';
      return;
    }
    reset();
    status.textContent = 'Backup imported to this browser. No cloud synchronization.';
  });
  cancel.addEventListener('click', () => {
    reset();
    status.textContent = 'Import canceled. Nothing was changed.';
  });
  return { reset };
}
