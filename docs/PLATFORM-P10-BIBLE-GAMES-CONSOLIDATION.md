# Platform P10 — Bible + Games projection in Hub

P10 changes canonical product-family membership, not the public catalogue layout.

## Bible

Existing cards remain:

- TMS60 → `bible/tms60`
- Biblical Greek → `bible/greek`

Selah (`bible/study`) and My Daily Devotion (`bible/devotion`) are bound as providers but remain staged in Hub until they have canonical public launch surfaces.

## Games

Existing cards remain:

- Micro Arcade → `games/arcade`
- Gomoku → `games/gomoku`
- WORDSTRIKE → `games/wordstrike`

The existing Arcade URL is also the active `games/home` launch surface. Hub does not create a second duplicate Games card during P10.

## Compatibility rule

P10 does not remove cards, change catalogue categories, rewrite project routes, or rewrite production URLs. Later Hub work can group these cards by product family using the P10 projection instead of inferring family membership from categories/tags.
