---
schemaVersion: 1
code: G-006
slug: ligo-quizabend
title: LiGo Quizabend
subtitle: Community quiz-night system
aliases:
- ligoquiz
- quiz night
- quizabend
- community quiz
category: games
type: quiz
status: live
visibility: listed
summary: Run a hosted quiz night with teams, timers, game formats, scoring, presentation, and clear rules.
repo: thiepn/ligoquiz
liveUrl: https://thiepn.dev/ligoquiz/
tags:
- quiz
- community
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
accent:
  light: '#84406F'
  dark: '#E58BC3'
preview:
  tier: P4
  type: synthetic
  provenance: synthetic
  component: LigoQuizPreview
  duration: 3900
actions:
  primaryLabel: Play
  source: true
dateAdded: '2026-08-18'
yearAdded: 2026
capabilities:
- title: Host-led rounds
  description: Present questions in a format designed for an in-person community quiz night.
  previewState: question
- title: Timed answers
  description: Give teams a clear response window without turning the experience into a complex game show system.
  previewState: timer
- title: Answer resolution
  description: Lock and reveal the chosen answer in a way the host can explain immediately.
  previewState: answer
- title: Team scoring
  description: Carry the consequence of each round into an understandable team score.
  previewState: score
gallery:
- label: Question
  caption: The host presents a clear round prompt.
  variant: question
- label: Answer
  caption: A team answer is locked and resolved.
  variant: answer
- label: Score
  caption: The round consequence becomes visible to the room.
  variant: score
---

A host-centered quiz-night system built for community events, with game selection, rules, timers, team scoring, and presentation flows.

It is designed around a real room with a host and teams, so the interface prioritizes explanation, pacing, timers, answer resolution, and visible scoring. The software supports the social event rather than trying to replace the host with automation.
