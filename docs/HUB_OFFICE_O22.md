# O22 — Original citation revision audit

Same open draft PR #175 and `feature/hub-office-o1-native-documents`, originating at O21 `51baea9d427da7d8a99b4c6368a7cb377fa70309`.

O22 reads a real retained Office revision and current original Markdown source and compares footnote IDs, definition counts, original authored definition text, use counts, and already-detected problems. It presents source-labeled additions, removals, edits, use-count and issue changes; shows unchanged counts without inferring citation ID renames or external provenance. Limits fail closed instead of truncated untrustworthy comparisons. Unchanged source code pseudoreferences are excluded by the existing O19 analyzer.

O22 lives inside the O20/O21 citation workbench, with a retained-revision selector and read-only changed-citation rows. Current-source navigation uses original offsets and the existing editor; historical navigation uses the existing Office timeline, retained previews and recovery. All actions guard source identity, original revision and current source snapshot. Source changes, document switches, saved revision changes, and privacy masking clear sensitive audit output. No new persistent writer, index, schema, editor, or external citation verification is introduced.

Tests cover definition edits, missing/unused/duplicate changes, Unicode, CRLF positions, code exclusions, long source bounds, retained revision browser navigation, reload and mobile privacy. Existing Account IndexedDB-before-consent and WebKit Account refresh failures remain independent release blockers. No merge, deploy, migrations, paid manually triggered CI, credentials or production writes.
