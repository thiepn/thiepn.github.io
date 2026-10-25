# THIEPN release gate Phase 4

Only an actual owner-approved, independently signed promotion can expose a Released app. No keypair, signing secret or approval is created here. The Ed25519 public key and receipts must originate in a separately authorized offline operator process. The GitHub branch is not itself authorization.

The signed payload commits to the complete canonical serialized certificate, exact source and deployed SHA, version, nine outcomes, checked evidence URLs, review fields, and blockers; editing evidence or scope invalidates the signature. Runtime verification checks one signed receipt for every `approved` certificate and rejects missing, duplicated, stale or forged receipts. Approval signatures do not independently prove live site behavior or human/device testing; operators must still verify all nine gates using external evidence. No release is listed until explicitly signed.

For G3 only, `NOT_APPLICABLE` requires a real `local-only` app and an explanatory reason. G1/G2/G4/G5/G6/G7/G8/G9 cannot be waived.

**Clean30:** frozen release `052731bd44f7e2113fd789be55dfb199d4f82fae`. Original lockfile: 2 high severity advisories (Vite and source-map-js). Disposable `npm audit fix --package-lock-only` changes only six lockfile lines each direction; subsequent `npm ci`, audit (0), unit/build/release/runtime pass. Owner repository and production not updated. Requires authorized owner adoption and browser/CI requalification on the resulting SHA.

**Recipe:** pinned `b9cf98453a017145d36c7d0ebb6c8b3054a8fd5b`. PostgreSQL 17 harness applies seven original migrations, with one explicitly documented terminal literal `\\n` typo normalized in a throwaway copy (other source bytes unchanged). Uses real PostgreSQL RLS, non-BYPASSRLS authenticated/anon roles and locally signed PostgREST JWTs. Distinguish mock disposable signing authority from live THIEPN Account tokens. Do not claim live PostgREST/Core permission certification.

**TMS60:** pinned `12343b974417c3ba23b64f592961c151e52f7ede`. PostgreSQL 17 harness applies five original Account migrations and tests real RLS, two signed owner identities, translation data, backups and identity-bound destructive RPC. The sixth H15 Hub projection is NOT_TESTED without upstream Core H12/H13 schema; no fake provider data. Production not touched.

The legacy /apps catalog and all 31 launch identities remain unchanged; /dev/release-apps is a noindex, certified-only draft view. Overall release gate remains NO-GO until signed approvals, complete infrastructure and real-device evidence exist.
