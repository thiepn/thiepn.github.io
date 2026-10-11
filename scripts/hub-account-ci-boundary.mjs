/**
 * CI R1: source-only fail-closed boundary for private Account checkouts.
 * No private token/secret is referenced from public pull_request workflows.
 * A separately reviewed privileged CI system is required to run paired tests.
 * This gate intentionally authorizes NO event, including protected main push.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const PRIVATE_ACCOUNT_GATE = 'BLOCKED_PRIVATE_ACCOUNT_CI';

export function classifyAccountCIContext({ eventName, ref, repository }) {
  if (repository !== 'thiepn/thiepn.github.io') return {
    code: 'BLOCKED_WRONG_REPOSITORY',
    message: 'Private Account CI is restricted to the reviewed THIEPN Hub repository.',
  };
  if (eventName === 'pull_request' || eventName === 'pull_request_target' ||
      eventName === 'merge_group') return {
    code: 'BLOCKED_UNTRUSTED_PR',
    message: 'PR/merge-queue code must not access private Account source or tokens. A separate privileged qualification is required.',
  };
  if (eventName === 'push' && ref === 'refs/heads/main') return {
    code: 'BLOCKED_OWNER_CREDENTIAL_HANDOFF',
    message: 'Protected main alone is insufficient to authorize Account access. Owner-reviewed, separately restricted trusted CI is required.',
  };
  return {
    code: 'BLOCKED_UNAPPROVED_EVENT',
    message: 'Event/ref not approved for private Account source access.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = classifyAccountCIContext({
    eventName: process.env.GITHUB_EVENT_NAME ?? '',
    ref: process.env.GITHUB_REF ?? '',
    repository: process.env.GITHUB_REPOSITORY ?? '',
  });
  process.stderr.write('::error title=' + result.code + '::' + result.message + '\n');
  process.stdout.write(PRIVATE_ACCOUNT_GATE + ': ' + result.code + '\n');
  process.exitCode = 1;
}
