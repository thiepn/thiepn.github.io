# V2_GLOBALIZATION

## Core Principles

1. **Canonical Storage is Locale-Independent**: Resource IDs, JSON property keys, system enum identifiers, monetary values (cents/integers), and temporal records (`YYYY-MM-DD` / ISO timestamps) are stored uniformly across all systems. Changing UI language or regional settings NEVER rewrites stored data.
2. **Display is Locale-Aware**: Regional dates, numbers, currency symbols, and unit labels are formatted dynamically via bounded `Intl` instances.
3. **Deterministic Collation**: Alphabetical sorting employs locale-specific rules (including Turkish dotted/dotless `I`/`İ` and German `ä`/`ö`/`ü`/`ß`) while preserving stable secondary Resource ID tie-breakers.

---

# V2_LOCALIZATION

## Translation Architecture

- **Semantic Domain Namespaces**: Translations are partitioned into `core`, `navigation`, `editor`, `tasks`, `finance`, `health`, and `accessibility`.
- **ICU-Compliant Pluralization**: Uses `Intl.PluralRules` with exact match overrides (`=0`, `=1`, `other`).
- **Safe Fallback**: Any missing key seamlessly falls back to English (`en`) and finally to `[domain.key]` without throwing runtime exceptions.
- **Pseudo-Localization**: Development mode expands text by ~35% with accented Unicode characters `[!!! Ḗẍƥȧȧƞḓḗḓ !!!]` to catch fixed-width clippings.

---

# V2_ACCESSIBILITY

## WCAG 2.2 AA Compliance

- **Keyboard Operability**: Full navigation supported without pointer devices.
- **Focus Management**: Focus restoration stack restores previous active elements upon modal/picker dismissal.
- **IME Composition Guard**: Suppresses action handlers while `isComposing` is active.
- **Non-Spatial Alternatives**:
  - **Board**: `moveToColumn` keyboard action.
  - **Calendar**: Accessible date/time reschedule fields.
  - **Canvas**: Structured card and connection list.
  - **Graph**: Structured neighbor link hierarchy.
  - **Charts**: Factual data tables and statistical summaries.

---

# V2_UNICODE

## Safety & Fidelity

- **UTF-8 & BOM Stripping**: Detects and safely strips `\uFEFF` without character offset drift.
- **Grapheme Clusters**: Computes perceived cluster lengths for emojis (ZWJ, skin tones, flags) avoiding surrogate pair truncation.
- **BiDi Security**: Sanitizes directional spoofing controls (`\u202E` RLO) in filenames and URLs while preserving legitimate user content.
