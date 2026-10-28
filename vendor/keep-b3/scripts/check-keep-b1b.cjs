/** Portable B1b regression gate; no browser, service, credentials or writes outside temp. */
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const cwd = path.resolve(__dirname, '..');
const output = mkdtempSync(path.join(tmpdir(), 'keep-b1b-test-'));
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--lib', 'ES2022,DOM', '--outDir', output, '--skipLibCheck', '--esModuleInterop',
    'src/pkm/integration/ownerResourceRefs.ts', 'src/pkm/integration/keepResourceSpine.ts', 'src/pkm/integration/resourceLinks.ts', 'src/pkm/integration/sourceOwnerAdapters.ts', 'src/pkm/personalization/favoritesManager.ts', 'src/pkm/personalization/configExportImport.ts'], { cwd, stdio: 'inherit' });
  execFileSync(process.execPath, ['tests/keepResourceSpine.cjs'], { cwd, stdio: 'inherit', env: { ...process.env, KEEP_COMPILED_DIR: output } });
} finally {
  rmSync(output, { recursive: true, force: true });
}
