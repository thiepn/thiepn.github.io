# H23 — Mobile Reading Pilot & Device Acceptance

H23 enables an explicitly labeled phone/tablet preview for the device-local Library reading pilot. It retains explicit tab join, independent Library consent, summary/Continue-only scope, foreground checks, pause polling and RAM-only metadata. No account, cloud, writes or search are enabled.

The H23 control and release IDs intentionally replace H21: older loaded controllers reject the new configuration and end their sessions rather than silently adopting a wider cohort. New clients accept only the H23 device-only scope, including `desktopOnly: false`. Restoring the previous H22 commit restores the desktop cohort. The existing full pilot pause procedure remains available.

## Browser acceptance

The same seven consent, metadata, accessibility, clearing, pause, delayed response and genuine-empty cases now run on Chromium, Firefox, WebKit, Android Chromium and iPad WebKit. Two additional mobile cases check opt-in, responsive width, at least 44px resume targets, dark presentation and explicit exit. Total: 37 browser cases. They use the actual immutable Library bridge and synthetic progress. Emulator results are not physical-device certification.

## Physical acceptance still open

On the S21 browser and iPad Safari, open Hub Home and try the preview using non-sensitive reading progress. Enable summary/Continue in Library sharing; return, join and connect. Verify correct current/furthest positions and exact-edition Continue. Return to Home and verify it requires joining again. End the pilot, background the browser, hide Home and reload; each must clear metadata. Test portrait/landscape, pinch zoom, browser back, and private browsing. Unavailable storage must show recovery rather than claim an empty library.

Different browser profiles and private browsing do not share Library progress. The pilot offers no cross-device synchronization. Record browser/version and observed behavior without book titles or tokens. No physical results are fabricated, and no automated feedback collection is introduced.

Next proposed phase: **H24 — Reading Connection & Return-Flow Polish**, driven by actual preview feedback and any reproducible device defects.
