import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED = ['schemaVersion','app','displayName','path','accountContract','sdkContract','integrationMode','operationsVersion','sessionAuthority','degradedMode','health'];
const AUTH_ENTRY_POINTS = new Set(['email-password','google','password-recovery']);
const INTEGRATION_MODES = new Set(['sdk-1.x','certified-legacy']);
const SOURCE_EXTENSIONS = new Set(['.js','.mjs','.cjs','.ts','.tsx','.html','.astro']);
const SDK_MARKER = '/account-platform/sdk/v1/index.js';
const FORBIDDEN_SOURCE = [
  ['broad localStorage clear', /localStorage\.clear\s*\(/],
  ['implicit/global Supabase sign-out', /\.auth\.signOut\s*\(\s*\)/],
  ['retired Diet backend', /mrrqsqawwxwebsdmrnre/],
  ['retired Notes session key', /notes\.supabase\.session\.v1/],
  ['retired Diet auth backup', /diet-copilot-thiepn-auth-token-backup-v2/],
  ['retired Diet auth vault', /diet-copilot-auth-vault/],
];

export function validateConsumerManifest(manifest) {
  const errors = [];
  for (const field of REQUIRED) if (!(field in (manifest || {}))) errors.push(`Missing manifest field: ${field}`);
  if (manifest?.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(manifest?.app || ''))) errors.push('app must be a lowercase kebab-case slug.');
  if (typeof manifest?.displayName !== 'string' || !manifest.displayName.trim()) errors.push('displayName is required.');
  if (!/^\/[a-z0-9][a-z0-9/-]*\/$/.test(String(manifest?.path || '')) || String(manifest?.path || '').includes('//')) errors.push('path must be a same-origin absolute app path ending in /.');
  if (manifest?.accountContract !== '1.0') errors.push('accountContract must be 1.0.');
  if (manifest?.sdkContract !== '1.x') errors.push('sdkContract must be 1.x.');
  if (!INTEGRATION_MODES.has(manifest?.integrationMode)) errors.push('integrationMode must be sdk-1.x or certified-legacy.');
  if (manifest?.operationsVersion !== 'A7.1') errors.push('operationsVersion must be A7.1.');
  if (manifest?.sessionAuthority !== 'thiepn-account') errors.push('sessionAuthority must be thiepn-account.');
  if (manifest?.health?.networkFailureLogsOutUser !== false) errors.push('networkFailureLogsOutUser must be false.');
  if (manifest?.authEntryPoints !== undefined) {
    if (!Array.isArray(manifest.authEntryPoints) || manifest.authEntryPoints.some((item) => !AUTH_ENTRY_POINTS.has(item))) errors.push('authEntryPoints contains an unsupported entry point.');
  }
  return errors;
}

async function sourceFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(full);
    }
  }
  await walk(root);
  return files;
}

export async function validateConsumerRoot(root) {
  const manifestPath = path.join(root, '.well-known', 'thiepn-app.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const errors = validateConsumerManifest(manifest);
  const files = await sourceFiles(root);
  let source = '';
  for (const file of files) source += `\n/* ${path.relative(root, file)} */\n${await readFile(file, 'utf8')}`;
  for (const [label, pattern] of FORBIDDEN_SOURCE) if (pattern.test(source)) errors.push(`Forbidden consumer pattern: ${label}.`);
  if (manifest.integrationMode === 'sdk-1.x' && !source.includes(SDK_MARKER)) errors.push(`SDK integration must import ${SDK_MARKER}.`);
  return { manifest, errors, files: files.map((file) => path.relative(root, file)) };
}

async function main() {
  const root = path.resolve(process.argv[2] || 'examples/account-consumer');
  try {
    const result = await validateConsumerRoot(root);
    if (result.errors.length) {
      console.error(`THIEPN Account consumer validation failed for ${result.manifest?.app || root}:`);
      for (const error of result.errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`THIEPN Account consumer PASS: ${result.manifest.app} (${result.manifest.integrationMode})`);
  } catch (error) {
    console.error(`THIEPN Account consumer validation could not run: ${error?.message || 'Error'}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
