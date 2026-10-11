# THIEPN Hub — Habits V1 source-only local recovery preview

- Stacks on exact-qualified Habits V0 PR #122, head 114ecb845dcd59bfe76be9f3aaa8aa00322e19da.
- Extends only the isolated /home/prism-preview/habits/ route; locked Prism Home, HomeDocument, production PWA and screenshot goldens remain unchanged.
- Manual local JSON download carries check-ins, weekly targets and URLs; no service calls, token export or automated sync.
- Import requires exact matching verified Hub UUID scope, or explicit device-only mode. Imported files must pass format/version/date/URL validation; rejected data never overwrites the existing record.
- File selection previews counts; cancellation preserves data. Explicit confirmation and successful localStorage readback are required before claiming import success.
- Downloads are not encrypted; user must protect copies. Device-only records are shared across a browser profile. There is no cloud backup.
- Automated unit and 3-engine browser tests are required. User opted to skip physical device testing, which remains NOT TESTED rather than PASS.
- All seven inherited human release gates remain OPEN. NO_GO to merge, deploy or integrate this into the locked Prism Today layout.
