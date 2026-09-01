---
schemaVersion: 1
code: C-003
slug: browser-games
title: Browser Games
summary: Games and hosted play experiences that run directly in the browser, from precision arcade play to surreal 3D worlds and long-form systems.
type: persistent
projects:
- micro-arcade
- wordstrike
- wordfall
- curio
- nebula-foundry
- the-bible-challenge
- skyspire
- impossible-transit
- voidcut
anchors:
- micro-arcade
- wordstrike
- voidcut
- impossible-transit
relationships:
- from: micro-arcade
  to: wordstrike
  label: Focused arcade play
  note: Micro Arcade collects many short-form game loops in one shell, while Wordstrike develops a single precision typing mechanic into a dedicated arcade experience.
- from: wordstrike
  to: wordfall
  label: Typing as the core mechanic
  note: Both transform keyboard accuracy into immediate game action, but use different spatial pressure models.
- from: wordstrike
  to: voidcut
  label: Precision under pressure
  note: Both reward fast, exact input and immediate correction, with one centered on typing and the other on spatial cuts.
- from: curio
  to: nebula-foundry
  label: Systems & progression
  note: Both ask the player to read systems, make trade-offs, and build value over repeated decisions.
- from: skyspire
  to: nebula-foundry
  label: Long-run progression
  note: Both support sessions where accumulating progression changes how later play feels.
editorialNote: 'A cross-section of how far browser play can be pushed: a 31-game instant-play arcade, precision typing games, quiz play, long-form incremental systems, atmospheric action, and a complete first-person 3D journey. The collection is organized by play pattern rather than by a single genre.'
keywords:
- browser games
- arcade
- quiz
- incremental
- strategy
- typing
- 3D
---
