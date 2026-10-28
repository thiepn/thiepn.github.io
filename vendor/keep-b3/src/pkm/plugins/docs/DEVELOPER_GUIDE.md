# PKM Plugin Architecture & Developer Platform Guide (API v1)

Welcome to the PKM Plugin Architecture and Developer Platform (Phase P41). This system allows developers to extend the PKM application safely without compromising vault security, offline guarantees, or canonical data models.

---

## 1. Core Principles

1. **Strict Sandboxing**: No plugin executes directly in the main UI JavaScript realm. Plugin logic runs inside isolated Web Workers or sandboxed iframes (`sandbox="allow-scripts"`).
2. **Capability-Based Permissions**: Plugins must declare exact permissions in `manifest.json`. Users review human-readable permission descriptions prior to installation.
3. **Optimistic Concurrency**: All note mutations route through canonical versioned APIs with `expectedVersion` guards, preventing stale writes from overwriting user edits.
4. **Network-Less Architecture**: In Phase P41, external network requests (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`) are completely blocked.
5. **Private Namespaced Storage**: Plugins receive an isolated, quota-bounded key-value store (5MB limit) that respects vault locking.

---

## 2. Plugin Manifest (`manifest.json`)

Every plugin package must include a root `manifest.json` file.

```json
{
  "id": "org.example.word-count",
  "name": "Advanced Word Counter",
  "version": "1.0.0",
  "apiVersion": "1",
  "description": "Calculates word count and reading time for highlighted text.",
  "author": {
    "name": "Jane Developer",
    "email": "jane@example.org"
  },
  "category": "utility",
  "entryWorker": "worker.js",
  "permissions": [
    "notes.read:selected",
    "commands.register"
  ],
  "contributions": {
    "commands": [
      {
        "id": "count-words",
        "title": "Calculate Word Count",
        "description": "Counts words in selected text",
        "icon": "Calculator",
        "requiresSelection": true
      }
    ]
  },
  "supportsMobile": true
}
```

---

## 3. Permission Reference

| Permission | Risk Level | Description |
| :--- | :--- | :--- |
| `commands.register` | Low | Register custom actions in Command Palette (`Mod+K`). |
| `workspace.view` | Low | Contribute isolated visual workspace panels. |
| `notes.read:selected` | Low | Read only the text explicitly highlighted by the user. |
| `notes.write:selected` | Medium | Replace or format highlighted text in active note. |
| `notes.read:current` | Medium | Read the title, content, and tags of the active note. |
| `notes.write:current` | High | Edit the currently active note with optimistic concurrency. |
| `notes.read:metadata` | Medium | Read note titles, tags, and timestamps without note bodies. |
| `search.metadata` | Low | Query titles and tags matching a search term. |
| `storage.private` | Low | Access private isolated key-value storage (5MB quota). |
| `import.register` | Medium | Register custom import adapters for the Migration Hub. |
| `export.register` | Low | Register custom publish/export transformers. |
| `events.subscribe` | Medium | Receive resource IDs when notes are created or saved. |

---

## 4. Worker Script Implementation (`worker.js`)

```javascript
// Called when the plugin worker is instantiated
function onActivate(api) {
  api.log.info("My plugin activated!");
}

// Called when a registered command is invoked by the user
async function onCommand(commandId, context, api) {
  if (commandId === 'count-words') {
    const text = await api.notes.getSelectedText();
    const count = text.split(/\s+/).filter(Boolean).length;
    
    return {
      message: `Selected text contains ${count} words.`
    };
  }
}
```

---

## 5. Sandboxed Workspace Views (`ui/index.html`)

For visual plugins declaring `entryUi: "ui/index.html"`:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { padding: 12px; font-family: var(--font-sans); }
    .card { background: var(--bg-secondary); border: 1px solid var(--border); padding: 12px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <h3>Plugin Workspace</h3>
    <button id="loadBtn">Load Metadata</button>
    <div id="output"></div>
  </div>
  <script>
    document.getElementById('loadBtn').onclick = async () => {
      const meta = await window.pkm.notes.getMetadataIndex();
      document.getElementById('output').textContent = `Vault has ${meta.length} notes.`;
    };
  </script>
</body>
</html>
```

---

## 6. Packaging & Local Installation

1. Create a `.zip` archive containing `manifest.json`, your entry files, and assets.
2. Open PKM **Settings** → **Plugins** (or press `Mod+K` and type `Plugins`).
3. Click **Install Plugin from File** and select your `.zip` or `.json` package.
4. Review requested capabilities in the permission modal and click **Grant & Install**.
