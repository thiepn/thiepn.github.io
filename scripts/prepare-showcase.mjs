// Reuse existing authentic captures as build-time Astro image inputs.
// No runtime image service, extra dependency or remote fetch is required.
import fs from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve('public/projects');
const target = path.resolve('src/assets/showcase/projects');
await fs.rm(path.resolve('src/assets/showcase'), { recursive: true, force: true });
async function copy(dir, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const a = path.join(dir, entry.name), b = path.join(dest, entry.name);
    if (entry.isDirectory()) await copy(a, b);
    else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) await fs.copyFile(a, b);
  }
}
await copy(source, target);
console.log('Prepared authentic project media for Astro image optimization.');
