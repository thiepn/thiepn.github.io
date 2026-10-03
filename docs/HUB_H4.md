# THIEPN HUB H4 — Daily Home modules

H4 implements a finite, personalized daily board on `/home/`. It is stacked on H3 and is not deployed. The board provides real app-owned actions today; it does not claim that private summaries, calendar events, routine completions or reading positions have been integrated. H3's owner endpoint and H2's production identity certification gates remain open.

## Scope reconciliation

The recovered roadmap described H4 as Faith, Study and Routines with optional agenda/weather. The preceding H3 implementation deferred the daily composition while establishing Notes, Library and TMS60 contracts. H4 therefore composes Today, Continue and Capture together with those supporting modules. It uses the reviewed 27-app directory and canonical launch URLs; it does not add excluded/unreleased apps or a second task/notes database.

| Module | Working behavior | Data still unavailable |
|---|---|---|
| Today | Selected-zone day context; Notes checklist launch and full app directory | Appointments, planner tasks and overdue counts |
| Continue | Library saved-reading route; Notes owner app | Actual recent resource titles, reading position and timestamps |
| Capture | Explicit Notes text/checklist handoffs | Inline writes, idempotent save receipts and task/link destinations |
| Faith | Canonical TMS60 and Unreached app launchers | Translation-specific due counts, reading-plan passage, private prayer state |
| Study | French 3000 and MathLab launchers | Next lesson, review counts, mastery and course-state projection |
| Routines | Clean30 and Steadybar launchers | Scheduled tasks, recurrence and completion history |
| Calendar (optional, off) | Opens Google Calendar explicitly | Calendar connection/scopes, event import and agenda replica |
| Weather (optional, off) | Opens DWD explicitly; location chosen at the source | Inline Cologne forecast, source freshness and forecast API |

Today and Continue explicitly state that their summaries/resources are not connected. The other cards describe opening/choosing work in its app rather than presenting fabricated progress. No app data is read by this board. The H3 manifest remains `handoff-only`, with private reads and inline writes disabled for all three pilots; its runner is not instantiated.

## Exact presentation

The existing 56-pixel portal header and labeled mobile bottom navigation remain. At enlarged text, the header can grow/wrap rather than overflow or clip controls. The Home header places the functional date above the title and Hide Home/Customize actions. Account stays directly available, with concise session wording; the pin shelf follows it.

Daily Home has a short ownership note and a Today/Focus view choice. The six default cards appear in this stable document/keyboard order: Today, Continue, Capture, Faith, Study, Routines. At 1200 pixels and above they form three columns; 760–1199 uses two columns; smaller widths use one column. There is one page scroll, with no carousel or independently scrolling column. The full app directory remains below the board and is reachable from the pin shelf's All apps link.

Cards use ordinary theme surfaces, readable rows and modest topic accent rules. Every action includes its owner/source and a visible destination. Links use `rel=noreferrer`, carry no user resource ID/content/token, and work without JavaScript. Cards expand for text; fixed-height clipping and ellipsis are not used for their content. Compact phone pins use four columns at normal text and fewer when text is enlarged. Theme, contrast, focus outlines, reduced motion and forced colors retain the existing shell behavior.

## Personalization and ownership

The version-1 preference envelope gains a bounded optional `home` object. Existing stored pins and spacing continue to load without migration or reordering. Missing or malformed `home` values fall back to defaults independently of valid pins. Unknown module/zone/mode fields are not rendered or retained.

```ts
home: {
  modules: ['today', 'continue', 'capture', 'faith', 'study', 'routines'],
  mode: 'today',
  focus: 'study',
  timezone: 'device',
  hidden: false
}
```

Customize can enable/disable any of the eight modules, choose Study/Faith for Focus, and select Device, Europe/Berlin, Asia/Seoul, Europe/Istanbul or UTC. These fields are UI preferences, not grants. Calendar/weather choices cause no background request, location query, imported data or new Google permission.

Focus shows the enabled Today/Continue/Capture cards plus the enabled chosen Study/Faith card. It hides supporting/passive modules without rewriting their choices or changing pins, grants, app data or directory order. A selected focus card is not automatically enabled. Explicitly disabling every module is valid and shows a small Customize/Today recovery message. Reset pins & spacing and Reset daily modules are independent; neither reset reveals a hidden Home.

Preferences use H2's existing keys:

| Context | Namespace |
|---|---|
| Guest | `thiepn:hub-preferences` |
| Verified account | `thiepn:hub-preferences:user:<canonical-uuid>:v1` |
| Checking/unavailable identity | No account preference read/write; defaults shown, Customize and view changes disabled |

Guest state is not adopted as account state. Each verified account loads its own fields. Sign-out returns to guest fields. Unverified identity clears the previous account's view just as it clears its pins. Theme continues to follow the existing shell policy. This is browser-local personalization; no cloud preference sync is introduced.

Storage failure keeps changes for this visit and reports that limit. Cross-tab storage changes update the matching active namespace. No app-local keys, IndexedDB, cloud records, schema, Account registry or app repository is changed.

## Hide Home behavior

Hide Home removes the Account card, personalized pin shelf and daily board from visible layout, accessibility navigation and keyboard tab order. The public app directory and Show Home/Customize remain usable. A short explanation replaces the hidden surface. The setting persists in the current preference namespace and can be reversed using the same keyboard-focused action.

A local privacy hold remains active through session re-verification and namespace changes in that page. A storage event that reveals another tab does not reveal a tab that already holds the shield; that tab needs its own Show Home action. Resetting modules/pins does not override the shield. Hide Home also works while identity verification is unavailable; it does not require a verified account to hide the surface.

This is visual privacy, not authentication, encryption, app sign-out or deletion. Settings remain deliberately accessible through Customize. Static HTML contains only public default links/metadata; account preferences load only after H2 identity verification. No private provider result is loaded in H4. Before enabling future private modules, hiding/locking must synchronously cancel their requests and clear their in-memory projections using H3's lifecycle rules. CSS hiding alone is not sufficient for that future boundary.

## Date, DST and lifecycle

The header and Today context use one `Intl.DateTimeFormat`-based presentation zone, resolved from the device or the explicit selection. The stable civil day key is derived from year/month/day parts in that zone, not from UTC slicing or adding 24 hours. Changing Home timezone changes presentation only; it writes no app reading day, review due date or routine completion.

The date refreshes once per minute while visible and immediately on visibility return or `pageshow`. Background tabs do not poll the network or repeatedly format the clock. Returning after midnight updates the context even if the browser throttled the interval. Unit coverage includes Berlin spring/fall DST boundaries, local midnight and Seoul/Berlin day differences.

Future agenda/routine providers must preserve owner semantics: date-only commitments remain civil dates; timed events retain an absolute instant and owner timezone; all-day/recurrence exceptions need explicit tests. Hub cannot infer or mutate a due schedule from a title, display timezone or button click. Today's date is not evidence that a particular owner's routine was completed or reset.

## Performance and integration boundaries

H4 adds no dependency, recurring service, private request, iframe bridge, token handoff, analytics event, local resource-history cache or offline promise for another app. Loaded Home controls work offline, and its canonical links remain present; opening a destination offline depends on that app's own installation/cache. Reloading Hub offline is not certified, and H4 does not introduce a service worker.

Module/action metadata lives in `src/lib/daily-home.ts`; pure view validation/date behavior lives in `src/lib/home-view.ts`. Astro resolves app actions from the reviewed catalogue and build-fails on missing/insecure destinations. Supported Notes/Library/TMS60 launch intents come from H3's provider registry. App onboarding does not need a new Home card for every future app; the directory/pins remain metadata-driven. Future personalized cards must consume bounded owner projections, preserving H3's six-contribution/three-request limits.

Local audit: Home initial HTML/JS/CSS is approximately 29.2 KiB gzip, versus H3's 26.3 KiB, within the existing performance budgets. This metric excludes subsequent media/fonts and is not a field Web Vitals claim. Production provider quota/egress remains a gate before enabling data-backed modules.

## Verification

Validation on 2026-10-01: 118 unit checks passed, including 16 new H4 cases. All 49 local Chromium browser checks passed: 22 H1 foundation, 6 H3 provider, 9 H4 daily-board and 12 paired Hub/Account checks. Typecheck returned zero errors/warnings with seven existing hints. Build, generated-output, catalogue/link syntax and performance checks passed. Cross-engine/physical-device and real authenticated owner API certification remain open. Coverage includes:

- Legacy preference recovery, bounded settings, explicit empty module choices, Focus non-mutation, reviewed owner URLs, selected-zone midnight and Berlin DST.
- Module/view persistence, independent resets, Hide Home across reload/remote storage changes, blocked storage, no-JavaScript links and loaded-page offline controls.
- Existing H1 app search, pins, scale and accessibility; existing H3 discovery/no-private-read assertions, adapted to the new Daily Home composition.
- Actual built H2 Hub and Account with the real SDK and controlled issuer responses: guest/A/B daily views and timezone isolation, sign-out and privacy hold through failed re-verification. This fixture does not certify live Google or real private owner APIs.
- Mobile/desktop light/dark, enlarged text, axe, source/build/generated/catalogue/link syntax and performance checks.

The temporary browser install from H3 was unavailable in this workspace. Verification restored Chromium 153 through a scratch-only package; application dependencies/lockfiles are unchanged. A 200% text overflow found during verification was fixed by allowing header, pin and app-action reflow. Private reading/agenda/scheduler/routine fixtures were not substituted for real current app state.

Primary references consulted 2026-10-01: [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat), [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [W3C WCAG 2.2 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). These informed date-zone formatting, return-from-background refresh and readable reflow. H0/H1/H2/H3 remain the project capability and identity baselines.

## Release limits and next phase

This PR is a tested daily board and action-layer implementation, not the completion of all envisioned private daily integrations. Merge/deployment and H2 live identity certification remain separate. Real Today/Continue/reading/routine summaries, durable inline capture, Calendar authorization and an attributed forecast adapter require owner/provider implementations and evidence before enablement. The app-owned scheduler, edition, account/device and translation rules must remain authoritative.

Next: **H5 — Search and Inbox**. Extend the public search/attention composition with explicit coverage and failure states; private federated results and actionable Inbox items remain gated on certified owner endpoints and scoped authorization. Do not invent unread counts or expose unverified private search results merely to fill the interface.
