# THIEPN Hub — Daily Habits V0 (isolated draft)

## Scope and location
- New noindex route: /home/prism-preview/habits/
- The existing /home/, /home/prism-preview/, five Prism blocks, responsive HomeDocument v2, lock-tested reference visuals and all release gates are unchanged.
- V0 is a separate Prism-shell preview page, not an activated production Home block and not a new standalone app.
- No backend, migrations, API calls, notifications, new dependencies or third-party trackers.

## Manual model
Seven fixed habits: morning devotion (7/week); Bible memorization (6); French (6); reading (5); fitness (3); music (3); evening prayer (7). All weekly targets can be changed to 1–7. One date per habit counts at most once, check-ins can be undone, and weeks run Monday–Sunday in local browser time. This is a count of self-reported completions, **not** validated time or activity in other apps. It is neither streak-based nor a claim about quality of devotion/prayer.

## Quick launch audit
- TMS60, THIEPN Library and Le Carnet Français: launch URL resolved from the existing reviewed Hub project registry at build time.
- My Daily Devotion: currently not part of that Hub registry; its launch URL remains explicitly unconfigured by default. The habit remains usable for manual check-ins.
- Fitness and music: link slots unconfigured by default.
- Owner can save optional HTTPS URLs or same-site relative paths. JavaScript, data, HTTP, userinfo and protocol-relative URLs are rejected. Open tool never automatically marks completion.
- No automatic import of TMS60, Library, French or MDD progress. A verified opt-in provider contract and owner authorization are prerequisites for V1 integrations.

## Storage, trust and recovery
- LocalStorage only; browser/device scoped. Verified Hub IDs use distinct local keys; signed-out device mode is intentionally shared by users of the same browser.
- During account checking/unavailability, prior progress is concealed; if account is unavailable, device mode requires explicit selection. No account-linked claims, cloud sync or remote writes.
- Invalid/future/corrupted records fail closed without overwriting the stored data. Browser storage failure is shown honestly: changes may only remain in the tab.
- No automatic history pruning or cross-device backup; no offline cloud replay.
- No stored personal notes, health measurements, prayer text, or account tokens.

## QA
Run npm run typecheck, npx vitest run tests/unit/prism-habits-v0.test.ts, npm run build and npx playwright test -c playwright.studio.config.ts -g 'Habits V0', in addition to standard PR CI. Mobile/browser manual approval is still required; a synthetic test is not real device acceptance.
No merge, deploy, credential/settings modification, sync activation, or screenshot-golden updates are authorized.
