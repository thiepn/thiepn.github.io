# V2.18 GLOBAL USABILITY & ACCESSIBILITY AUDIT

## 1. Executive Summary & Baseline State

Prior to V2.18, the Personal OS achieved mature stability, recovery mode, native platform cohesion, first-party domain depth, power-user efficiency, and research-grade knowledge management. However, deep systemic inspection revealed several latent internationalization, locale coupling, and accessibility bottlenecks:

- **Direct String & Locale Coupling**: Isolated date and numeric helpers relied on uncontrolled `toLocaleString()` calls without explicit fallback, risking locale drift in cross-device sync.
- **IME & Multi-byte Composition**: East-Asian IMEs (Korean Hangul, Japanese Kanji) could prematurely trigger shortcut or Enter-key handlers during active character composition if not gated.
- **BiDi Security**: Unicode Right-to-Left Override (`\u202E`) characters presented potential visual spoofing vulnerabilities in filenames, URLs, and package IDs.
- **Non-Spatial Alternatives**: Visual-only Canvas and Graph views lacked first-class structured semantic hierarchies for screen-reader and keyboard-only users.

## 2. Global Usability & Accessibility Architecture

V2.18 establishes a centralized, zero-dependency globalization and accessibility layer:

1. **Locale-Independent Canonical Invariance**: All storage schemas, Resource IDs, ISO timestamps (`YYYY-MM-DD` / ISO 8601), exact money representations (integer cents / ISO 4217), and enum values remain strictly locale-independent.
2. **Centralized Formatting & Parsing Engine**: Bounded `Intl` caches for `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.Collator`, and `Intl.PluralRules` prevent garbage collection overhead while supporting comma decimals (`1,5` -> `1.5`), grouping separators, and unambiguous date parsing.
3. **Unicode, Grapheme & Filename Safety**: Grapheme cluster boundary slicing, UTF-8 BOM detection/stripping, and NFC/NFD cross-platform filename collision detection.
4. **Offline Multilingual Search**: Diacritic-folding and Hangul/CJK n-gram tokenization operating completely locally without cloud AI.
5. **Product-Wide Accessibility Primitives**: Roving tabindex, focus restoration stacks, throttled aria-live announcements, and structured tabular/outline alternatives for Canvas, Graph, and Charts.
