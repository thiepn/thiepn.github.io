# Hub CI R14 — Synthetic disposable filesystem sandbox and deterministic H1 captures

**Source-only research/test implementation. NO_GO for privileged Account CI or deployment.** R14 is stacked on R13 PR #131 at exact parent `896646a7ac3188b81caebdb44aec00decf250f28` without altering any of the original six Account workflow checkouts, commit pins, original Playwright suites, application source, production main, or screenshot golden assets.

## What genuinely runs

- `scripts/ci-r14-sandbox-core.mjs`: builds a deterministic fictional offline fixture with SHA-256 manifest and a copied **local** Node binary and dynamically linked runtime libraries, without contacting package registries or any service. Refuses changed fixture bytes, changed manifest identity, unexpected files, symlinks and missing dynamic loader. The temporary root filesystem is removed after execution.
- `scripts/ci-r14-sandbox-runner.mjs`: launches a disposable subprocess in separate Linux user, network, mount and PID namespaces. It binds the staged chroot as read-only, enables loopback only, asserts zero IPv4/IPv6 routes, changes root to the staged filesystem and drops identity to UID/GID 65534. Environment is a three-field allowlist, without tokens.
- `scripts/ci-r14-sandbox-worker.mjs`: inside the chroot, reads and hashes fictional assets, observes denial of host `/etc` and `/proc` reads, denial of host UNIX socket and synthetic host canary, actual outbound TEST-NET TCP rejection (`ENETUNREACH`), failed rootfs writes, successful synthetic localhost HTTP and a credential-free environment. No real private checkout or CI tests executed.
- `scripts/ci-r14-sandbox-bootstrap.sh` implements the privileged-in-new-user-namespace mount preparation and contains no source- or secret-fetch command.
- `tests/unit/ci-r14-sandbox.test.mjs`: eight ordinary local-source regression/negative tests that can run inside standard GitHub Quality CI; no live private test or namespace entitlement claimed by these.
- `tests/standalone/ci-r14-sandbox-local.test.mjs`: eight dependency-free Node tests, one of which executes the actual Linux kernel namespace/chroot/loopback/outbound/cleanup sequence, and one of which verifies unsupported execution fails closed.

Run on a supporting Linux machine using Node >=22.12:

    node --test tests/standalone/ci-r14-sandbox-local.test.mjs
    node scripts/ci-r14-sandbox-runner.mjs /tmp/r14-synthetic-evidence-new.json

The runner creates a separate read-only chroot containing minimal runtime + synthetic fixtures; it does **not** provide full confidential virtualization, seccomp, cgroups, arbitrary-process capability analysis or a verified host-kernel boundary. Specifically `fullIsolationProven:false` and `executionAllowed:false` always. It requires Linux user namespace mapping for root and nobody, mount support, `/usr/bin/unshare`, `/usr/sbin/chroot`, `/usr/sbin/ip`, and local `ldd`; on unsupported platforms it returns nonzero NOT_TESTED/FAIL_CLOSED and cleans up. NEVER feed it actual Account source, secrets, private artifacts or hostile candidate code.

## Visual determinism

The original H1 screenshot test captured a live civil date: R12 showed Sunday 11 October 2026 and R13 showed Monday 12 October 2026 for `home-1440-light.png` and `home-390-dark.png`, with the other two H1 captures unchanged. R14 invokes Playwright's `page.clock.install({time:new Date('2026-10-11T12:00:00.000Z')})` **inside only the H1 capture test and before navigation**, and asserts the document's local date remains `2026-10-11`. No production date behavior, screenshot golden or acceptance threshold was edited. R14's exact-head original archives must be compared bytewise with R12 and R13; do not claim restored identity until evidence exists.

## Safeguards and unresolved gates

Local host isolation does not establish safety for private source, production data or a publicly triggered privileged runner. No independent reviewer, protected Azure control plane, atomic replay store, cryptographically witnessed repository checkout, revoked GitHub App token or private Account paired execution exists. Offline **real** npm/pnpm, Playwright/browser, Vite/Astro and Library/TMS60 preparation remains NOT_TESTED; the prepared runtime uses only synthetic built-in Node modules. Public fail-closed private checkouts must remain untouched. All seven human H15 release gates stay OPEN, six physical observations NOT_TESTED, and release, merge, deployment, migration and rollback remain NO_GO.
