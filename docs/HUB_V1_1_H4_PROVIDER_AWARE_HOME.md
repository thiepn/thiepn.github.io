# THIEPN Hub V1.1 H4 — Provider-Aware Daily Home Integration

## Scope and status

H4 is a **provisional, unmerged draft** based on H2 PR #96 at
`60ab07a304c04aef43bff5a202770f3ca42663fe`.
H3 provider certification is not yet implemented in this stack, and H2's
Library/capture gates were not complete when this branch was created.
Before any acceptance or promotion, reconcile this branch onto a fully
qualified H3 successor; no green H4 check substitutes for that missing work.

## Product behavior

- Continue, Now, Study and Recent distinguish observed empty activity from
  disconnected, expired, offline, error, unauthorized and unsupported reads.
- A successful empty result from one provider cannot mask another provider's
  failed read for the same operation.
- Availability is **coarse operational state only**: no title, resource ID,
  account UUID, device ID, verse count, session credential or query is added.
- Continue retains its existing Library exact-edition URL, Notes handoff and
  TMS60 owner URL; no private write or automatic Search is added.
- Now remains bounded and uses real TMS60 due-count snapshots only.
- Study uses verified TMS60 summary data only; empty/failed snapshots do not
  fabricate progress, and other providers do not substitute for TMS60.
- Recent uses authorized ready summary items only, with existing five-item
  cap and existing provider handoffs.
- Failed and expired states render text-only recovery guidance without
  fetching providers or requesting consent automatically.
- No Prism tokens, layout dimensions, navigation, screenshot baselines or
  production flags were changed.

## Qualification

The added tests cover disconnected states, operation isolation, provider
failures versus empty snapshots, expiry, revocation, exact-edition handoffs,
stale private-data redaction and disconnected 390/1440 px browser rendering.

Run exact-head Quality, owner/Account, Library, Notes capture and TMS60
workflows, and inspect full job logs, artifacts and Playwright reports.
Manual Google sign-in, actual two-owner isolation, S21/iPad acceptance,
authenticated production parity, canonical promotion and any Core general
HomeDocument sync remain explicit separate release gates.

This branch must remain draft. No merge, deploy, new permission scope, owner
endpoint, background private fetch or visual baseline update is authorized.

## Next H5

H5 — Recovery and lifecycle certification: verify keyboard/screen-reader
recovery, multi-tab provider revocation, offline/online owner transitions,
translation switching, device-level reconsent, and release-acceptance evidence
on the qualified H3→H4 stack.
