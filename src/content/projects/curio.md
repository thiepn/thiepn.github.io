---
schemaVersion: 1
code: G-003
slug: curio
title: Curio
subtitle: Auction appraisal strategy
aliases:
- objects of questionable value
- auction game
- appraisal game
category: games
type: game
status: live
visibility: listed
summary: Inspect unusual objects, estimate their value, and compete through calculated auction decisions.
repo: thiepn/curio
liveUrl: https://thiepn.dev/curio/
tags:
- strategy
- auction
- game
capabilityTags:
- local-first
- offline
platforms:
- desktop
- tablet
controls:
- mouse
- touch
collections:
- browser-games
accent:
  light: '#865934'
  dark: '#D59C67'
preview:
  tier: P4
  type: static
  provenance: static
actions:
  primaryLabel: Play
  source: true
dateAdded: '2026-08-18'
yearAdded: 2026
capabilities:
- title: Object appraisal
  description: Inspect unusual objects and form a value estimate from incomplete evidence.
- title: Auction decisions
  description: Translate appraisal confidence into bidding and purchasing decisions.
- title: Deterministic runs
  description: Use reproducible seeds so outcomes can be tested and balanced consistently.
- title: Local play
  description: Run entirely in the browser with no account or backend requirement.
---

A deterministic auction and appraisal strategy game centered on evidence, inspection, valuation, rival behavior, and long-term collecting decisions.

Each run asks the player to decide what an object is worth before certainty is available. Inspection evidence, valuation ranges, rival behavior, and bidding create the tension; deterministic seeds keep those decisions reproducible enough for balancing and comparison.
