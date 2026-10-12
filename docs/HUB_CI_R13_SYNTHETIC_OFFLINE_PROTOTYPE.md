# THIEPN Hub CI R13 — Genuine synthetic offline namespace prototype

**Scope: SOURCE-ONLY / NO_GO TO PRIVILEGED CI.** Stacked directly on R12 draft PR #130 exact head da9a7276bb1e4bca1bcc7e4da3e0a4d732c1fabc. No Account checkout, private token, GitHub App, Azure infrastructure, merge, deployment, production data, workflow privilege, release gate or screenshot golden change.

## Executable source

- scripts/ci-r13-synthetic-core.mjs generates deterministic FICTIONAL payload and text files in an ephemeral temporary directory, with SHA-256 manifest, six inherited immutable Account suite pins and three immutable external TMS60/Library source refs. Rejects missing/extra files, symlinks, tampered bytes, changed pins and manifest mismatches. Also inspects six actual checked-in public workflows for inherited pre-checkout guards and exact Playwright configs.
- scripts/ci-r13-synthetic-worker.mjs operates after Linux user and network namespace creation. It verifies a distinct /proc/self/ns/net, empty IPv4/IPv6 route tables, actual ENETUNREACH denial for an outbound TEST-NET-2 numeric TCP probe, and a working 127.0.0.1 HTTP synthetic fixture. No public API or production service is contacted.
- scripts/ci-r13-synthetic-runner.mjs creates the namespace using /usr/bin/unshare with a restricted environment, invokes the worker, checks all five reported observations, removes the temporary workspace in finally, then emits an optionally saved mode-0600 JSON receipt. Any failed test or unsupported namespace leaves a nonzero exit status. This prototype uses Linux-specific binary locations (/usr/bin/unshare, /usr/sbin/ip).
- tests/unit/ci-r13-synthetic-core.test.mjs adds eleven adversarial Vitest tests to the inherited Quality suite; all six original workflow guard/ref/test command checks run against actual repo source.
- tests/standalone/ci-r13-offline-local.test.mjs adds seven dependency-free Node built-in tests including an actual kernel namespace/egress/local HTTP/cleanup smoke test.

## Run (Linux with unprivileged network namespace support)

    node --test tests/standalone/ci-r13-offline-local.test.mjs
    node scripts/ci-r13-synthetic-runner.mjs /tmp/thiepn-r13-synthetic-evidence.json

Use a new evidence path: it refuses overwrite. Observed locally 2026-10-12: 7/7 Node tests PASS, separate network namespace PASS, no IPv4/IPv6 routes PASS, numeric outbound TCP failed with ENETUNREACH, loopback HTTP PASS, fixture digests and source pin count PASS, temporary workspace cleanup PASS. The JSON reports status PASS_SYNTHETIC_NETWORK_NAMESPACE_ONLY, executionAllowed false, privateSourceAccessed false, credentialsIssued false, and fullFilesystemIsolation false.

## What PASS does NOT mean

1. This is **NOT full filesystem isolation**. No chroot/mount namespace/container security boundary protects other host files or sockets. NEVER put real private Account source, credentials, secrets or untrusted code into this prototype.
2. It does not preload real npm/pnpm modules, Chromium/Firefox/WebKit browsers, Vite/Astro builds, Library/TMS60 owner builds, or run any of the original six paired browser suites. Those are NOT TESTED offline.
3. The current host allowed Linux user/network namespace creation. GitHub-hosted/Azure-hosted runners may block unshare; CI only runs source-level Vitest tests, not this namespace worker. Host-specific capability is NOT TRANSFERABLE.
4. Browser request interception is not OS-level network isolation. No strong hostile-process exfiltration prevention, mount/device/capability denial, independently protected trust root, signed owner/independent reviewer, protected branch, external atomic nonce ledger, or private artifact witness is implemented.
5. A deliberately synthetic manifest contains immutable pins from R12 but proves neither exact Git checkout bytes nor authorization to fetch private Account. The original R1 public guard remains fail-closed and requires a separately governed privileged environment.

## Immutable inheritance

Three suite Account refs: 19abe54a605ee7fe121d91e4b5cbef0f0b74763b. Additional Account refs: 5b426c40e9e174c11c36604c1ef2c18a6aa155d8, 676413adfeef68f50e2bae95364fd43afbb6b497, 9cddcbcdb36e6260be3761ae35b221b1a7b8e271. TMS60: 21d733b015f12a7c58e0d1728ef9edf5fa30a074 and 3ecc39eb517f6cd4d4171046e376fc4108f928c. Library: 77058023894f4d7935c79e291a5dba7daacb8666.

All six private Account paired suites remain BLOCKED/NOT_EXECUTED, all seven H15 human gates OPEN, six physical kinds NOT_TESTED, original screenshot goldens preserved, main unchanged and production/release NO_GO.

Next: an independently protected control-plane, true disposable filesystem sandbox, offline dependency/browser bundle, negative escape tests and separate setup plus exact-SHA test authorization. None is authorized or provisioned in R13.
