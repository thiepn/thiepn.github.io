# H25 — Physical Reading Acceptance & Pilot Readout

Status: **awaiting physical-device results**. Prepared 2026-10-06. H25 is not complete until both device records below contain actual observations and the release decision is updated. This document does not change the application or activate additional integrations.

## Qualified baseline

Hub main: `7b259fefa503a1e39921403957db912e84384961` (H24, PR #86). Public entry: https://thiepn.dev/home/.

| Evidence | Verified result | Source |
| --- | --- | --- |
| Unit tests | 251 passed | [Quality job](https://github.com/thiepn/thiepn.github.io/actions/runs/37461176628/job/112260838481) |
| General site browser suite | 528 passed | Same Quality job |
| Reading pilot suite | 42 passed across Chromium, Firefox, WebKit, Android Chromium and iPad WebKit | [Pilot job](https://github.com/thiepn/thiepn.github.io/actions/runs/37461176580/job/112260837871) |
| Production | Build, deployment and verification succeeded; 31 live catalogue projects and 50 exact Hub artifacts verified on 2026-10-06 at 12:20 UTC | [Deployment](https://github.com/thiepn/thiepn.github.io/actions/runs/37462413738) |
| Physical Galaxy S21 Plus | Not run; no observations supplied | Device record below |
| Physical iPad 9 / Safari | Not run; no observations supplied | Device record below |
| Participant feedback | No recorded feedback; usability effectiveness unknown | Voluntary readout below |

Automated reading cases use synthetic progress through immutable Library owner `77058023894f4d7935c79e291a5dba7daacb8666`. They establish that tested browser configurations work; they do not establish physical touch, operating-system lifecycle, Safari storage behavior or user satisfaction. The production check verifies served Hub bytes, not authenticated or physical usage.

Current control: `H23-library-reading-v1`, device scope, summary/Continue only, mobile preview enabled. Hub shows metadata and opens the exact Library edition/release; Library owns the reader, consent and saved position. This is browser-profile reading, not account or cross-device sync. Managed cloud workflows remain off.

## Physical test: about 15 minutes per device

Use the browser you actually read in on the S21 Plus and Safari on the iPad. Record OS/browser versions and test time. Keep the same browser profile and the canonical `https://thiepn.dev` origin for Library and Hub. Use a non-sensitive current EPUB/PDF; web-format progress is outside this pilot. Do not erase real Library progress to create a test condition. Screenshots are optional and must omit titles, account details and tokens.

Each case must be marked pass, fail or blocked with a brief observation. A missing prerequisite is blocked, not pass.

| ID | Action | Expected observation |
| --- | --- | --- |
| D01 | Open Home fresh, without choosing Try reading pilot. Then choose it, but do not connect. | No reading titles or percentages at either step. Joining alone shows connection controls. |
| D02 | In Manage Library sharing, inspect the choices. If both summary and Continue are already off, leave them off and return/join/connect. Otherwise record this denial case as blocked unless willing to temporarily turn them off. | With neither permission, a sharing/recovery message appears; no reading cards and no successful-empty Browse Library state. Restore any temporarily changed choices after testing. |
| D03 | Enable the desired summary/Continue sharing in Library. Open a current EPUB/PDF and save a recognizable reading position. Return to Home, join and connect. | Matching title/format, current and furthest progress appear. Signing in alone is not needed. No repeated permission setup is required when consent remains enabled. |
| D04 | Choose Continue reading. Check the matching edition and resumed position against the Library reader. | The correct edition opens at the saved current position. If edition identity cannot be confirmed, mark blocked; opening any book is insufficient. |
| D05 | Read to another position, then return using browser Back. Join/connect again. Also try returning to a still-open Home tab. | Return never restores an old snapshot automatically. A fresh explicit connection shows the new saved position once Library has saved it. |
| D06 | While connected, switch apps or tabs, then return. Separately lock the device, unlock and return. | Reading cards are cleared and a fresh join/connect is required for both lifecycle paths. |
| D07 | Separately test End pilot, Hide/Show Home, Disconnect this tab and reload. Reconnect between cases. | Each clears the visible snapshot. End, Hide/Show and reload require joining again; Disconnect stays joined but requires connecting again. No automatic cards return. |
| D08 | If a connection is slow enough to observe, tap Connect/Refresh again and then End pilot. If requests complete too quickly, mark physical busy observation blocked. | Busy controls reject duplicate taps; End remains usable. No delayed card reappears after exit. Automated delayed-response coverage is already recorded separately. |
| D09 | Check portrait and landscape, light/dark appearance, pinch zoom, long titles and touch controls. | No clipped controls or forced horizontal scrolling at ordinary viewport sizes. Zoom permits reading and operating controls. Continue, End and sharing links are usable. |
| D10 | Use TalkBack on Android or VoiceOver on iPad if available. Navigate the heading, connection controls, progress and Continue. Otherwise mark blocked. | Controls are named and operable, progress identifies its book, and status updates can be understood. Record repeated/absent announcements as friction or defects. |
| D11 | Open an isolated private/incognito profile and repeat fresh join/connect. Only enable consent there if desired. Do not import real history to force a result. | No normal-profile snapshot leaks into it. With absent consent, show sharing recovery; with consent and genuinely empty supported progress, show the empty state. If storage fails, show recovery rather than claim successful emptiness. A private session may support storage; failure is not required. |

An offline connection failure is not a destructive test: it must clear/fail safely and must not present stale cards as fresh. Server pause/configuration outage remains covered by automated fixtures; do not pause the public pilot solely to complete a personal device test.

## Device records — unfilled

Copy this block once for each device. Keep book names, chapter/CFI text, email addresses, tokens and private content out of the record.

```text
Device: Galaxy S21 Plus / iPad 9
OS version:
Browser + version:
Date/time + timezone:
Normal/private profile:
D01:
D02:
D03:
D04:
D05:
D06 (app/tab and lock/unlock separately):
D07 (End, Hide/Show, Disconnect, reload separately):
D08:
D09:
D10:
D11:
Failure reproduction (case, steps, expected, observed):
Setup friction: none / minor / prevents use; reason:
Would you use Hub Continue rather than opening Library directly? yes / no; reason:
```

No analytics or feedback collection endpoint is introduced. Feedback is volunteered here or in the work chat. The user's answer about usefulness is qualitative feedback, not a retention metric.

## Pilot readout and decision

| Question | Current answer |
| --- | --- |
| Does the implemented device-local flow work in the tested engines? | Yes, within the 42 automated cases and their fixture boundary. |
| Is the current Hub production release verified? | Yes, at the dated deployment above. Later releases require their own evidence. |
| Does it work on the user's physical S21/iPad? | Unknown pending device observations. |
| Is join/connect friction acceptable in actual reading? | Unknown pending voluntary feedback. H24 clarified return instructions and serialized connection controls. |
| Is cross-device reading available? | No; it is outside the current scope. |
| Can the pilot be called physically accepted or expanded now? | No. Retain the existing labeled preview while collecting results. |

Acceptance requires both devices to pass D01 and D03–D07, no unresolved privacy or wrong-edition failure, and D09 to have no usability blocker. D02, D08, D10 and D11 remain explicitly limited wherever blocked; those limitations cannot be relabeled as physical passes. Physical accessibility qualification remains pending if D10 is blocked.

Any metadata leak, automatic restoration after clearing, denied-consent read or wrong-edition Continue blocks acceptance. Reproduce it and follow the existing pilot pause/rollback procedure in HUB_H21.md as appropriate. Other reproducible usability failures receive a focused fix and rerun of affected physical cases plus relevant automated coverage. Do not expand consent/cloud scope to solve setup friction.

Next action: obtain the two device records, amend this readout, and decide accept / targeted fixes / continue preview. H26 should be defect-only follow-up if results reveal defects; no new feature phase is justified by missing observations. If both devices pass and the flow is useful, close this reading-pilot acceptance work with its documented limitations.
