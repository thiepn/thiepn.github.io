---
schemaVersion: 1
code: G-005
slug: the-bible-challenge
title: The Bible Challenge
subtitle: Bible quiz collection
aliases:
- tbc
- bible quiz
- bible challenge
category: games
type: quiz
status: live
visibility: listed
summary: Play Bible knowledge challenges across multiple collections and modes in a browser-based quiz system.
repo: thiepn/tbc
liveUrl: https://thiepn.dev/tbc/
tags:
- bible
- quiz
- game
capabilityTags:
- local-first
platforms:
- desktop
- tablet
- mobile
controls:
- mouse
- touch
collections:
- browser-games
- bible-faith
accent:
  light: '#806128'
  dark: '#DFC26A'
preview:
  tier: P3
  type: synthetic
  component: BibleChallengePreview
actions:
  primaryLabel: Play
  source: true
dateAdded: '2026-08-18'
yearAdded: 2026
capabilities:
- title: Question collections
  description: Organize Bible questions into selectable collections rather than a single undifferentiated pool.
- title: Multiple play modes
  description: Reuse each collection across different quiz experiences.
- title: Immediate feedback
  description: Move cleanly from question to answer and next action.
- title: Local browser play
  description: Keep the quiz functional without an account or server dependency.
---

A Bible quiz game with selectable collections and multiple modes designed for direct browser play on desktop and mobile.

Collections are treated as reusable bodies of questions rather than progress gates, so a player can choose what to play and then apply different modes to it. The interface is designed to stay direct enough for casual browser play while still supporting repeated quiz sessions.
