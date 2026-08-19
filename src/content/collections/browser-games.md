---
schemaVersion: 1
code: C-003
slug: browser-games
title: Browser Games
summary: Games and hosted play experiences that run directly in the browser, from arcade typing to long-form systems.
type: persistent
projects:
- wordstrike
- wordfall
- curio
- nebula-foundry
- the-bible-challenge
- ligo-quizabend
- echoframe-last-signal
- skyspire
- analysis-idle
anchors:
- wordstrike
- wordfall
- curio
- nebula-foundry
- echoframe-last-signal
- skyspire
relationships:
- from: wordstrike
  to: wordfall
  label: Typing as the core mechanic
  note: Both transform keyboard accuracy into immediate game action, but use different spatial pressure models.
- from: curio
  to: nebula-foundry
  label: Systems & progression
  note: Both ask the player to read systems, make trade-offs, and build value over repeated decisions.
- from: the-bible-challenge
  to: ligo-quizabend
  label: Social quiz play
  note: Both turn questions into group-friendly play, with one centered on Bible knowledge and the other on flexible quiz-night
    hosting.
- from: echoframe-last-signal
  to: skyspire
  label: Atmosphere & movement
  note: These projects use audiovisual atmosphere and continuous movement to make browser play feel more spatial and game-like.
- from: skyspire
  to: nebula-foundry
  label: Long-run progression
  note: Both support sessions where accumulating progression changes how later play feels.
- from: analysis-idle
  to: nebula-foundry
  label: Incremental systems
  note: Analysis Idle and Nebula Foundry both use compounding progression loops, with different themes and pacing.
- from: wordstrike
  to: echoframe-last-signal
  label: High-pressure interaction
  note: Fast input and immediate feedback create pressure in both projects, despite very different mechanics.
editorialNote: 'A cross-section of how far a static browser can be pushed: arcade reflex games, social quiz formats, long-form
  incremental systems, atmospheric experiments, and progression-heavy action. The collection is organized by play pattern
  rather than by a single genre.'
keywords:
- browser games
- arcade
- quiz
- incremental
- strategy
- typing
- progression
---
