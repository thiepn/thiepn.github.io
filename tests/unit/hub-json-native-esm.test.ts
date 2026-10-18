import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

/** Playwright loads source modules in native Node ESM, not only through Astro/Vite.
 * Importing the generated JSON without its type attribute fails in Node 22.
 * Exercise the actual Hub import declaration against the real generated manifest.
 */
test('Hub launch manifest importer also works in native Node ESM', () => {
  const source = readFileSync('src/lib/hub.ts', 'utf8');
  const declaration = source.split(/\r?\n/u)[0];
  expect(declaration).toBe("import manifest from '../generated/launch-manifest.json' with { type: 'json' };");

  const originalManifest = readFileSync('src/generated/launch-manifest.json', 'utf8');
  const expectedEntries = JSON.parse(originalManifest).entries.length;
  const directory = mkdtempSync(join(tmpdir(), 'hub-json-esm-'));
  try {
    writeFileSync(join(directory, 'launch-manifest.json'), originalManifest);
    const nativeImport = declaration.replace('../generated/launch-manifest.json', './launch-manifest.json');
    const entry = join(directory, 'test-import.mjs');
    writeFileSync(entry, nativeImport + '\nconsole.log(manifest.entries.length);\n');
    const run = spawnSync(process.execPath, [entry], { encoding: 'utf8', timeout: 10_000 });
    expect(run.error).toBeUndefined();
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout.trim()).toBe(String(expectedEntries));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
