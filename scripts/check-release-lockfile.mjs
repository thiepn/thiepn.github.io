import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const file = 'package-lock.json';
if (!fs.existsSync(file)) {
  console.error('RC lockfile gate blocked: package-lock.json is missing. Run a networked npm install, review the lockfile, and commit it before RC certification.');
  process.exit(1);
}
try {
  execFileSync('git', ['ls-files', '--error-unmatch', file], { stdio: 'ignore' });
} catch {
  console.error('RC lockfile gate blocked: package-lock.json exists but is not tracked by git. Commit it before RC certification.');
  process.exit(1);
}
const lock = JSON.parse(fs.readFileSync(file,'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
  console.error(`RC lockfile gate blocked: lockfile version does not match package version ${pkg.version}.`);
  process.exit(1);
}
console.log(`RC lockfile gate passed: tracked package-lock.json for ${pkg.version}.`);
