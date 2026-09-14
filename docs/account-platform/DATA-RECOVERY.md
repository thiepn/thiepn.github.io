# Data Recovery

Use this runbook for failed migrations, accidental deletion, ownership mistakes, partial cutovers, duplicates or corruption.

## Recovery rule

Never bulk-copy first and investigate later.

Required sequence:

`identify exact delta -> prove intended ownership -> check conflicts -> repair transactionally -> verify semantic equivalence -> retain evidence`

## Before any write

1. Identify source and canonical destination.
2. Record row counts and logical keys.
3. Identify parent/foreign-key relationships.
4. Check whether semantically equivalent destination records already exist.
5. Check ID/request-ID conflicts.
6. Determine which identifiers must intentionally change, such as canonical `user_id` or parent IDs.
7. Preserve newer destination data.

## Repair

Prefer one transaction with explicit preconditions. Abort on unexpected conflicts. Never disable RLS or ownership controls merely to make recovery easier.

## Verification

After repair verify:

- expected records exist exactly once;
- ownership points to the canonical THIEPN account identity;
- child/parent relationships are valid;
- newer canonical records still exist;
- semantic/business fields match the source after excluding intentionally remapped IDs;
- application reads return the repaired state.

## Diet A6 precedent

The September 13 Diet cutover repair is the reference pattern: a semantically identical canonical day row was reused, while only the missing weight/meal/item/action delta was restored transactionally and ownership was remapped to the canonical account.

## Backups and source control

Application code, migrations, function source and operational contracts live in GitHub. Database recovery must use the Supabase backup capability available to the project plan plus targeted SQL evidence; Git is not a database backup.

Dashboard-only Auth/provider settings that are not expressed as SQL must be documented as configuration inventory before major account changes.
