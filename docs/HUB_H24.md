# H24 — Reading Connection & Return-Flow Polish

H24 addresses two findings from reviewing the live preview flow: return instructions did not distinguish saved Library consent from Hub's cleared snapshot, and connection controls could accept another action while a check was in progress. These are engineering findings, not participant feedback or physical-device certification.

The setup and return copy now explain that Library sharing remains in this browser until changed in Library. Leaving Home still clears metadata and requires explicit joining and connecting again; the return status says how to check fresh progress. No reading data or consent is stored by Hub to remember a return.

A token guards the complete connection/refresh action, including release checks, consent and progress loading. Busy controls disable duplicate Connect, Refresh and operation changes and expose aria-busy. End pilot and disconnect remain available. Clearing invalidates the action, allowing a new explicit session without waiting for an old response; an old action cannot unlock the newer one. Existing generation checks reject stale results.

The shared browser suite adds delayed-check busy/cancellation coverage and verifies an explicit reconnect after backgrounding. It runs on Chromium, Firefox, WebKit, Android Chromium and iPad WebKit: 42 cases including the two mobile-specific cases. Unit, type, build and exact release qualification remain required.

The H23 device-only release/control IDs and summary/Continue scope remain unchanged. Managed account/cloud workflows remain disabled. Physical S21 and iPad acceptance described in HUB_H23.md is still open.

Next: H25 — Physical Reading Acceptance & Pilot Readout. Record actual device behavior and user friction before expanding integrations; do not infer physical acceptance from browser emulation.
