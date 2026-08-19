import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PATHS, parseArgs } from './lib/catalogue-files.mjs';

const args = parseArgs();
const write = Boolean(args.write);
const projectsRoot = path.join(PATHS.public, 'projects');

function command(name) {
  const result = spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}
const magick = command('magick') || command('convert');
const ffmpeg = command('ffmpeg');

async function walk(dir) {
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full)); else files.push(full);
  }
  return files;
}

const files = await walk(projectsRoot);
const captures = files.filter((file) => path.basename(file) === 'capture-source.png');
const videos = files.filter((file) => file.endsWith('.webm'));
console.log(`Media optimizer: ${captures.length} capture source(s), ${videos.length} WebM file(s).`);
if (!write) {
  console.log('Dry run. Add --write to generate poster derivatives and normalize oversized WebM assets.');
  process.exit(0);
}
if (!magick && captures.length) console.warn('ImageMagick is unavailable; poster derivatives were skipped.');
for (const source of captures) {
  if (!magick) break;
  const dir = path.dirname(source);
  for (const [width, quality] of [[960, 82], [480, 80]]) {
    const out = path.join(dir, `poster-${width}.webp`);
    const binary = path.basename(magick) === 'convert' ? magick : magick;
    const params = path.basename(magick) === 'magick'
      ? [source, '-resize', `${width}x>`, '-strip', '-quality', String(quality), out]
      : [source, '-resize', `${width}x>`, '-strip', '-quality', String(quality), out];
    const result = spawnSync(binary, params, { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`Image optimization failed for ${source}`);
  }
}
for (const video of videos) {
  const stat = await fs.stat(video);
  if (!ffmpeg || stat.size <= 3 * 1024 * 1024) continue;
  const out = `${video}.optimized.webm`;
  const result = spawnSync(ffmpeg, ['-y', '-i', video, '-an', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', out], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Video optimization failed for ${video}`);
  await fs.rename(out, video);
}
