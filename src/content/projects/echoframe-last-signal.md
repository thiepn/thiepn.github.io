---
schemaVersion: 1
code: G-007
slug: echoframe-last-signal
title: 'ECHOFRAME: LAST SIGNAL'
subtitle: Temporal action roguelite
aliases:
- echoframe
- last signal
- echo game
category: games
type: game
status: beta
visibility: hidden
summary: Fight through runs built around temporal echoes that repeat and combine your previous actions.
repo: thiepn/echoframe
liveUrl: https://thiepn.dev/echoframe/
tags:
- action
- roguelite
- game
capabilityTags:
- local-first
platforms:
- desktop
controls:
- keyboard
- mouse
collections:
- browser-games
accent:
  light: '#5F5167'
  dark: '#B9A6C4'
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
- title: Signal-driven action
  description: Use the game world and feedback systems to maintain pressure around a clear action loop.
- title: Roguelite structure
  description: Build replayability through repeated runs and changing tactical circumstances.
- title: Readable combat state
  description: Keep the player informed through a compact, game-first interface rather than dashboard clutter.
- title: Browser deployment
  description: Deliver the complete play loop directly through a web build.
---

A deterministic action roguelite built around recording, replaying, and coordinating temporal echoes during combat.

Its identity comes from temporal coordination rather than a generic action loop. Recorded and replayed echoes turn earlier movement or combat decisions into resources that must be composed with the current run.
