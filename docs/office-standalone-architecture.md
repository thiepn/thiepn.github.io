# Standalone Office architecture — proposal, not a release
## O1
Keep Hub /home/documents and its existing identity namespace, IndexedDB stores, IDs, backups, revision history and compare-and-swap contract unchanged. Improve only navigation and composition layout. Validate existing workspace tests plus keyboard, responsive, import/export, cross-tab conflict, and reload behavior before deployment.
## O2
Use office.thiepn.dev as a single suite with /docs, /sheets, /slides routes. Keep the Hub as launcher. Start Docs only; use the existing thiepn/office repository once authorized. Integrate the existing THIEPN Account contract; do not assume a shared browser storage namespace across origins. Prefer a document repository interface with explicit version checks, local offline drafts and a separately reviewed authenticated sync adapter. Never silently copy records or introduce public access.
## Migration gate
Export from the original origin with explicit owner confirmation; validate source schema, IDs, revision history, size and duplicates; preview dry run; import into the authenticated target atomically, preserving IDs and original revision data; compare counts and content fingerprints and test rollback. Keep original storage readable and untouched until independently verified. No automatic deletion. No new DNS, infrastructure, migration, or production switch under O1.
## Release acceptance
Require actual browser proof of create/open/edit/autosave/reload, keyboard navigation, preview/export, backup/restore, CAS conflict handling, narrow viewport and auth/privacy boundaries. Keep the exact Hub app catalogue unchanged. Do not claim DOCX, cloud sync, or rich text before those features are implemented and tested.
