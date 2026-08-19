import fs from 'node:fs';
import path from 'node:path';

const dir = 'tests/visual/baselines';
const pngs = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((name) => name.endsWith('.png') && fs.statSync(path.join(dir, name)).size > 0)
  : [];
const config = JSON.parse(fs.readFileSync('visual-regression.config.json','utf8'));
const expected = config.targets?.length ?? 0;
if (!expected) {
  console.error('Visual RC gate failed: no canonical visual targets configured.');
  process.exit(1);
}
if (pngs.length < expected) {
  console.error(`Visual RC gate blocked: ${pngs.length}/${expected} approved PNG baselines exist. Review the Phase 13 contact sheet, approve baselines with npm run visual:update, and commit them before RC certification.`);
  process.exit(1);
}
console.log(`Visual RC baseline gate passed: ${pngs.length}/${expected} approved baselines.`);
