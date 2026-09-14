# A7 Recovery Drill Evidence

**Date:** 2026-09-14  
**Scope:** non-destructive production operations validation

## 1. Synthetic monitor failure and recovery

The first production A7 synthetic runs correctly failed while all three consumer shells remained healthy because the new platform health function's database probe was unhealthy.

The failure was isolated to the health implementation rather than hidden or downgraded:

1. Auth probe returned healthy.
2. Notes, Diet and WORDSTRIKE shell probes returned healthy.
3. Database health returned failure, making the overall workflow fail.
4. The incorrect database probe was diagnosed and corrected.
5. The health function was redeployed.
6. A subsequent external GitHub Actions run returned healthy for Auth, canonical database and all three consumers.

**Result:** PASS. The monitoring system detects an unhealthy dependency, fails without mutating production data, and returns to green after a repair.

## 2. Data-recovery conflict-check drill

A read-only SQL verification was run against the canonical Diet data repaired during A6. No writes were performed.

Expected and observed canonical state:

| Invariant | Expected | Observed |
| --- | ---: | ---: |
| repaired weight record | 1 | 1 |
| repaired meal | 1 | 1 |
| child meal items | 6 | 6 |
| repaired action-history rows | 2 | 2 |
| canonical 2026-09-13 day rows | 1 | 1 |
| duplicate action request IDs | 0 | 0 |

**Result:** PASS. The prior repair remains singular and internally consistent; a recovery operator can establish conflict-free preconditions without writing data.

## 3. Retired Diet rollback source

Supabase currently reports retired project `mrrqsqawwxwebsdmrnre` as `INACTIVE`. Production code contains no current reference to it and the canonical project remains authoritative.

No destructive action was taken. The project is retained as inactive rollback evidence until the remaining signed-in production smoke gates and provider recovery requirements are satisfied.

**Result:** PASS WITH LIMITATION. The rollback source is isolated from production traffic and preserved rather than deleted.

## 4. Frontend rollback drill

The rollback procedure is source-controlled and previous known-good deployment SHAs are available through GitHub history/Pages runs. A deliberate production rollback was **not** performed solely for certification because it would create unnecessary user-facing deployment churn.

The dry run verifies the required inputs are available: repository history, known-good commit SHA, Pages deployment history, layer-specific rollback instructions, and post-rollback health verification through the A7 synthetic monitor.

**Result:** DRY-RUN PASS. A true rollback remains an incident/release action and is intentionally not manufactured against production.
