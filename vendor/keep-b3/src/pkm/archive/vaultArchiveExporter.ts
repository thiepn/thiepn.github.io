import { Note, Folder, AppSettings } from '../../types';

export interface VaultArchiveManifest {
  version: string;
  vaultName: string;
  exportedAt: string;
  totalNotes: number;
  totalFolders: number;
  notes: Note[];
  folders: Folder[];
}

export class VaultArchiveExporter {
  public static createManifest(
    notes: Note[],
    folders: Folder[],
    vaultName: string = 'Personal Knowledge Vault'
  ): VaultArchiveManifest {
    return {
      version: '1.0.0',
      vaultName,
      exportedAt: new Date().toISOString(),
      totalNotes: notes.filter((n) => !n.trashed).length,
      totalFolders: folders.length,
      notes: notes.filter((n) => !n.trashed),
      folders,
    };
  }

  public static exportAsJSON(manifest: VaultArchiveManifest) {
    const jsonString = JSON.stringify(manifest, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `nexus-vault-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public static generateStandaloneHTML(manifest: VaultArchiveManifest): string {
    const encodedData = JSON.stringify(manifest).replace(/<\/script>/gi, '<\\/script>');
    const dateStr = new Date(manifest.exportedAt).toLocaleDateString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${manifest.vaultName} · Standalone Offline Archive</title>
  <style>
    :root {
      --bg: #0c0a09;
      --card-bg: #1c1917;
      --border: #292524;
      --text: #f5f5f4;
      --text-muted: #a8a29e;
      --accent: #f59e0b;
      --accent-hover: #d97706;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); display: flex; height: 100vh; overflow: hidden; }
    #sidebar { width: 320px; background-color: var(--card-bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; height: 100%; shrink: 0; }
    #search-box { padding: 12px; border-bottom: 1px solid var(--border); }
    #search-box input { width: 100%; background: #0c0a09; border: 1px solid var(--border); padding: 8px 12px; border-radius: 8px; color: var(--text); font-size: 13px; outline: none; }
    #notes-list { flex: 1; overflow-y: auto; padding: 8px; }
    .note-item { padding: 10px 12px; border-radius: 8px; margin-bottom: 4px; cursor: pointer; transition: background 0.15s ease; border: 1px solid transparent; }
    .note-item:hover { background: #292524; }
    .note-item.active { background: #451a03; border-color: var(--accent); color: #fef3c7; }
    .note-title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .note-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    #main-content { flex: 1; overflow-y: auto; padding: 32px 48px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
    .header-banner { border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; }
    .header-banner h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .header-banner .meta-bar { font-size: 12px; color: var(--text-muted); }
    #note-body { font-size: 15px; color: #e7e5e4; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .tag { display: inline-block; background: #292524; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px; color: #d6d3d1; }
  </style>
</head>
<body>
  <div id="sidebar">
    <div style="padding: 16px; border-bottom: 1px solid var(--border);">
      <h2 style="font-size: 15px; font-weight: 700; color: #fff;">${manifest.vaultName}</h2>
      <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Offline Archive · ${manifest.totalNotes} Notes</div>
    </div>
    <div id="search-box">
      <input type="text" id="filter-input" placeholder="Search archive (instant)..." onkeyup="filterNotes()" />
    </div>
    <div id="notes-list"></div>
  </div>

  <div id="main-content">
    <div class="header-banner">
      <h1 id="view-title">Select a Note</h1>
      <div class="meta-bar" id="view-meta">Archived on ${dateStr}</div>
    </div>
    <div id="note-body">Select any note from the left sidebar to view its canonical content.</div>
  </div>

  <script>
    const data = ${encodedData};
    let currentNoteId = null;

    function renderList(notesToRender) {
      const container = document.getElementById('notes-list');
      container.innerHTML = '';
      if (notesToRender.length === 0) {
        container.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 12px;">No matching notes found.</div>';
        return;
      }
      notesToRender.forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-item' + (note.id === currentNoteId ? ' active' : '');
        div.onclick = () => selectNote(note.id);
        const tags = (note.tags || []).map(t => '#' + t).join(' ');
        div.innerHTML = '<div class="note-title">' + (note.title || 'Untitled') + '</div>' +
                        '<div class="note-meta">' + (new Date(note.updatedAt).toLocaleDateString()) + (tags ? ' · ' + tags : '') + '</div>';
        container.appendChild(div);
      });
    }

    function selectNote(id) {
      currentNoteId = id;
      const note = data.notes.find(n => n.id === id);
      if (!note) return;

      document.getElementById('view-title').textContent = note.title || 'Untitled';
      const tagsHtml = (note.tags || []).map(t => '<span class="tag">#' + t + '</span>').join('');
      document.getElementById('view-meta').innerHTML = 'Updated ' + new Date(note.updatedAt).toLocaleDateString() + (tagsHtml ? ' &nbsp;' + tagsHtml : '');
      document.getElementById('note-body').textContent = note.content || '(Empty Note)';

      renderList(getFilteredNotes());
    }

    function getFilteredNotes() {
      const query = (document.getElementById('filter-input').value || '').toLowerCase().trim();
      if (!query) return data.notes;
      return data.notes.filter(n => {
        return (n.title || '').toLowerCase().includes(query) ||
               (n.content || '').toLowerCase().includes(query) ||
               (n.tags || []).some(t => t.toLowerCase().includes(query));
      });
    }

    function filterNotes() {
      renderList(getFilteredNotes());
    }

    // Initialize on launch
    renderList(data.notes);
    if (data.notes.length > 0) {
      selectNote(data.notes[0].id);
    }
  </script>
</body>
</html>`;
  }

  public static exportStandaloneHTML(manifest: VaultArchiveManifest) {
    const htmlString = this.generateStandaloneHTML(manifest);
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `nexus-vault-offline-bundle-${dateStr}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
