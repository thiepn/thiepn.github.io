# Hub Office O23 — one historical citation definition, original source recovery

Original draft PR #175; branch `feature/hub-office-o1-native-documents`; O22 ancestor `e6a3104d0a32f641076dc8761e86a0d4ac011bb5`.

O23 previews a single, uniquely defined historical footnote from the retained source already selected through O22. The read-only resulting original Markdown is inspected before one atomic in-memory edit, which invokes the existing Office autosave/IndexedDB CAS and bounded revision history. Only original definition content changes, preserving original ID, links, references, Unicode, CRLF, current unrelated changes and history. No new persistent writer, schema, editor, scheduler or source index.

Refuse missing, duplicate, code-only or unsupported historical definitions; stale owner, source, revision or baseline; uncommitted current drafts; exceeding original source limits; cancelled preview; privacy masking; and concurrent conflicts. The current Office writer resolves peer edits rather than silently overwriting them. Returning to retained history uses the original timeline. Historical source and user-authored text are never declared externally verified.

Unit cases cover source offsets, Unicode, CRLF, duplicates, missing, source caps, and no-op changes. Browser cases cover preview/cancel, selective save, prior revision reload, privacy and CAS. O22 exact-head source, TypeScript, Vitest and browser CI passed; Library/Reading Account consent failures and historic WebKit refresh remain independent release blockers. No merge, deployment, migrations, credentials, manually triggered paid CI or costs.
