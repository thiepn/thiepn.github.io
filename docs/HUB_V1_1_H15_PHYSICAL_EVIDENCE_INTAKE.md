# THIEPN Hub V1.1 H15 — Independent Physical/Original Evidence Intake & Conflict Escrow

## Source qualification and safe scope

H14 draft PR #109 at exact head `026e57a1d695dcba320398cdfbdfa8e4527346d9` was qualified before H15 was branched. All eight exact-head actions passed; Quality run [38071760957](https://github.com/thiepn/thiepn.github.io/actions/runs/38071760957) passed **434 unit tests**, **657 actual isolated Chromium/Firefox/WebKit browser tests**, TypeScript check, 58-page build, release gates and inherited nondeploying H6–H14 checks. All eight complete job logs were inspected. Independently downloaded:
- Quality ZIP 11677436357, SHA-256 `103c565db225fc20bddc7317118e0f576bd300d55dd6c84d88ec05ed1ba87cad`, **54/54 CRC-clean entries**.
- Notes contract ZIP 11676519576, SHA-256 `2ddffda1374202da9559dd2eab9e9c6d781dfedf8a9d6180190daddc24663364`, **1/1 CRC-clean entry**.
- H13 predecessor ZIPs 11675833360 / 11675827099 were independently SHA-256/ZIP CRC checked again.

H15 is a separate stacked **draft**, not a release. Existing H1–H14 branches remain unchanged and unmerged. Production still serves the reading pilot; no Prism cutover has been authorized.

## Actual H15 implementation

`src/lib/prism/h15-physical-evidence-intake.mjs` accepts tightly constrained **externally supplied reference claims**, never protected originals or Google credentials. The accompanying CLI is deliberately separate from all production and release code. It:
1. Binds every submission to the independently qualified H14 head, eight workflow run IDs, and original ZIP hashes/entry counts.
2. Validates six distinct real-device/assistive-technology observation kinds, each referencing a device session, original capture, observer and independent witness by SHA-256 only.
3. Validates owner-scoped original object/version, encrypted-backup, prior-stable and restored-byte references. A reporter's matching hash is only `MATCH_REPORTED` until independent original-byte restoration is performed and witnessed.
4. Escrows conflicting physical outcomes, re-used witness receipts, contradictory source/version or restored bytes, false restoration equality, duplicate owner decisions and owner/recovery signer aliasing. The conflicting indices are preserved in a redacted report; no conflicting evidence is silently resolved.
5. Keeps pre-cutover release-owner and postrelease recovery-owner **separate**, pending/declined only. Any submitted `GO` or executed rollback claim is structurally rejected. No owner approval can be manufactured from syntactically valid JSON.
6. Rejects extraneous/private fields, future/stale timestamps, repeated packet digests (when externally provided), uncontrolled packet sizes, symlinks and malformed original intake.
7. Emits only digest/count/conflict-index summaries; neither the evidence originals nor private reviewer identities are checked into Git. All release, merge, deployment, migration, CDN and rollback actions remain denied.

## Supplying authentic physical evidence (human-operated; none collected yet)

Do not fill in fake device outcomes or approve a gate from CI. Independently execute and document these six checks against the exact candidate build:

| Kind | Physical procedure |
|---|---|
| `android-chrome` | Galaxy S21 Plus, Chrome: visible Home layout, navigation, owner data isolation, offline and online recovery |
| `android-samsung-internet` | Same phone in Samsung Internet, repeat consent/revocation and responsive layout |
| `ios-safari` | iPad 9 Safari: layout, local storage recovery and session transitions |
| `android-talkback` | S21 TalkBack: accessible names, focus order, announcements and modal return |
| `ios-voiceover` | iPad VoiceOver: semantics, screen reader navigation, dialog focus and escape routes |
| `physical-keyboard` | Actual hardware keyboard: tab order, Enter, Escape, modal focus return |

For each independent capture, retain original evidence in the owner's **private, access-controlled external custody location**. Compute SHA-256 digests of the original capture, device session record, observer record and independent witness receipt. Keep the mappings, exact device details, timestamps and custody authorization out of this Git repository and outside ChatGPT. The JSON intake accepts digest-only references and a **reported** `PASS`, `FAIL` or `BLOCKED` result. Submission is not approval; the independently assigned reviewer must still inspect original evidence and confirm integrity, accessibility and rights separately.

For the previous-stable restore exercise, use an **authorized disposable** scope, record original object version and bytes, encrypted backup ciphertext, independent restoration steps and restored-byte digest. Do not overwrite or probe any protected production object. `MATCH_REPORTED` does not establish an actual recovered original. Conflicts require externally documented adjudication before any next phase.

To exercise the safe rehearsal:
```sh
node scripts/h15-external-intake.mjs --check
node scripts/h15-external-intake.mjs --rehearse
```
To inspect a privately collected, explicitly supplied JSON (never commit the raw file):
```sh
node scripts/h15-external-intake.mjs --intake /path/to/private/external-h15-intake.json
```
The external file must preserve the exact object structure of `docs/evidence/HUB_V1_1_H15_EXTERNAL_INTAKE.json`; `observations`, `recoveryWitnesses` and `ownerDockets` contain only fields documented by `h15-physical-evidence-intake.mjs`. The CLI exits 1 for invalid claims, 3 for conflict escrow and 0 for structurally valid pending data. It never returns approval.

## What remains explicitly OPEN

No independent physical Android/iOS testing, VoiceOver/TalkBack verification, genuine two-owner OAuth, rights approval, independent security/privacy certification, original-byte restore witness, external reviewer identity verification, Prism visual owner or release/recovery owner approval has been provided. All seven human gates remain OPEN. **Precutover: NO_GO. Postrelease: NOT_REQUESTED.**

The value of H15 is the operator-facing, private-evidence intake boundary and conflict visibility—not another synthetic approval system. Next effort should prioritize actual owner/device observation, original restoration and HomeDocument cloud-sync implementation. No merge, deploy, migration, purge, live private API or rollback.
