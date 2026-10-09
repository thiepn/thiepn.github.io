# THIEPN Hub V1.1 H2 — local durability and recovery

## Scope and release status

This work is stacked on the qualified H1 PR #95, which itself is stacked on the
unmerged Prism PR #94. This branch is a draft preview candidate; no production
promotion, user authentication, cloud synchronization, or public release is authorized.

## Storage contract

- IndexedDB database `thiepn-hub-home-v1`, store `home-records` is authoritative when available.
- Documents are partitioned by the existing guest or normalized validated UUID owner key.
- Every persisted state is validated using the H1 HomeDocument V2 validator and its 128 KiB limit.
- Read/write transactions compare a per-owner monotonic revision. A stale tab cannot silently overwrite a later durable version.
- Every successful transaction records a bounded (32-entry maximum) *local* pending-edit range, with deterministic coalescing of older ranges. Full content lives in the latest durable snapshot, not in each pending item.
- The existing owner-scoped localStorage V2 key remains a one-way import source and compatibility mirror. A mirror write failure does not invalidate an already committed IndexedDB transaction.
- Cross-tab BroadcastChannel messages contain only a partition key and revision; no document content or credentials. Storage events also trigger a serialized refresh. Remote changes clear in-memory Undo history.

## Offline/online behavior and conflicts

Offline customization commits locally with the same transaction protocol. On reconnect,
the app can inspect locally pending work; **it does not send those edits to a remote
service**. An unverified or missing Core transport is never treated as success.
A conflicting local write is rejected, the winning document is reloaded and Undo
history is cleared rather than merging unrelated structural edits silently.
A malformed IndexedDB record fails closed and does not silently reset or overwrite
the record. A browser without IndexedDB falls back to the prior localStorage path
with an explicit `legacy-only` status and no durable-sync claims.

## Pending server integration

At the inspected Core revisions there is no verified authenticated, owner-scoped,
general HomeDocument push/pull/bootstrap handler. No arbitrary endpoints are
constructed, no bearer tokens are persisted, and no outbox item is marked as sent.
A future owner-scoped adapter requires independently verified endpoints, authenticated
authorization/RLS, ETags or equivalent CAS semantics, durable cursors, conflict
resolution and two-device acceptance before activation.

## Qualification

Run the inherited Quality, Account, managed Notes, Inbox, capture, real Library and
TMS60 paired CI, plus Studio's cross-engine browser suite with the new local
durability tests. Keep mobile/desktop Prism visuals and screenshot baselines locked.
Physical S21/iPad accessibility, real Google OAuth, Core sync and human production
promotion remain separate manual gates.
