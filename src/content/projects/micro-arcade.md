---
schemaVersion: 1
code: G-012
slug: micro-arcade
title: Micro Arcade
subtitle: 31 instant-play browser games
aliases:
- micro arcade
- arcade
- mini game collection
category: games
type: game
status: live
visibility: listed
summary: A 31-game browser arcade with instant play, offline PWA support, local progression, multi-input controls, achievements, and optional global leaderboards.
repo: thiepn/arcade
liveUrl: https://thiepn.dev/arcade/
tags:
- arcade
- game
- action
- strategy
capabilityTags:
- local-first
- offline
- pwa
platforms:
- desktop
- tablet
- mobile
controls:
- keyboard
- mouse
- touch
collections:
- browser-games
accent:
  light: '#5B46C7'
  dark: '#B7A8FF'
preview:
  tier: P3
  type: static
  provenance: static
actions:
  primaryLabel: Play
  source: true
dateAdded: '2026-08-26'
yearAdded: 2026
capabilities:
- title: 31-game arcade
  description: Jump between thirty-one distinct mini-games from one unified browser-native arcade shell without installing separate titles.
- title: Offline-first play
  description: Install the arcade as a PWA and keep the game shell, lazy-loaded game chunks, local progress, favorites, and high scores available offline.
- title: Flexible controls
  description: Support keyboard, mouse, touch, on-screen controls, and a Gamepad API bridge so the same collection remains playable across device classes.
- title: Progress and competition
  description: Track achievements, statistics, favorites, and local records while optionally connecting to persistent global and weekly leaderboard services.
---

Micro Arcade packages thirty-one small games into a single fast-launch arcade built for desktop and mobile browsers. Each title is code-split and loaded on demand, while the shared shell handles navigation, settings, progression, accessibility, and recovery consistently.

The collection is designed to keep working without a backend: local statistics, high scores, achievements, favorites, settings, and progress remain browser-owned. An optional Cloudflare Worker and D1 service adds validated global profiles and leaderboards when connected.
