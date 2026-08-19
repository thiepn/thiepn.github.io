import fs from 'node:fs';
const required = [
  'release-candidate.json',
  'scripts/audit-release.mjs',
  'tests/e2e/phase14.spec.ts',
  '.github/workflows/release-candidate.yml',
  'docs/RELEASE_CANDIDATE.md',
  'docs/PHASE_14_REPORT.md'
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) { console.error(`Phase 14 validation failed. Missing: ${missing.join(', ')}`); process.exit(1); }
const site = fs.readFileSync('src/data/site.ts','utf8');
const phaseMatch = /phase:\s*(\d+)/.exec(site);
if (!phaseMatch || Number(phaseMatch[1]) < 14) { console.error('Phase 14 validation failed. SITE.phase must be at least 14.'); process.exit(1); }
const rc = JSON.parse(fs.readFileSync('release-candidate.json','utf8'));
if (!rc.featureFreeze || rc.severityGate?.critical !== 0 || rc.severityGate?.high !== 0) { console.error('Phase 14 validation failed. RC freeze/severity gate is invalid.'); process.exit(1); }
console.log(`Phase 14 release-candidate validation passed (${rc.release}; feature freeze; 0 Critical / 0 High gate).`);
