# THIEPN Hub Office — O6 guarded local backup recovery

Source: same draft PR #175, branch feature/hub-office-o1-native-documents, O5 starting SHA 74b80b7580fd3bb8dea26afe219b253ba8c9bc51. Base main: 04618de9ffb08fc96c1b5086f10c55be3ae0256b.

O5 Quality #39161019593 was cancelled during its browser suite, so it cannot qualify O5; existing account integration and seven cross-app workflows succeeded. Library #39161019580 and reading-pilot #39161019583 failed separate thiepn-hub-account IndexedDB consent assertions, unchanged by Office.

O6 implements explicit local Office .json backup selection (at most 20,000,000 bytes) with strict UTF-8 JSON decoding, exact supported top-level kind/schema/keys, bounded list, unique source IDs and original schema/history validation. It displays a full per-record restore review, existing-ID skips, new records and capacity checks. Backups exported by Office have no verified original owner identity; no source-owner inference or automatic cross-owner import is claimed. User must affirmatively confirm a restore to the current local Office owner scope.

At commit time, original Office IndexedDB `thiepn-hub-office-v1`, schema v1, and original document IDs/revisions remain authoritative. Inside one readwrite transaction, current owner keys are reread, same-ID collisions skipped (never overwritten), capacity of 100 enforced, and only missing records added with original UUID/id, revision and complete original history. Any DB failure aborts the transaction; no partial writes. Existing unsaved active edits must pass the original CAS saver before import. On Hub privacy or Account identity change the staged backup/preview is discarded and asynchronous file reads are fenced by nonce and epoch.

Source and browser tests cover valid O3 backup compatibility, malformed and duplicate IDs, revision history validation, restored history, duplicate policies, cancellation, mobile privacy, idempotence and concurrent capacity overflows. No arbitrary HTML/document execution or duplicate Office engine. KEEP, Manuscript, StudyOS, Folio and Hub workspace v1 stores are neither inspected nor modified.

No merge, deployment, production writes/migrations, credentials, cost or unapproved publication. Exact-head Quality, Vitest, build, Chromium/Firefox/WebKit and independent Account consent failures must be verified before release.
