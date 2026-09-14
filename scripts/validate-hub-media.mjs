import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFrontmatterDirectory } from './lib/catalogue-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const hub = JSON.parse(await readFile(resolve(root, 'src/data/hub.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'src/generated/hub-media.json'), 'utf8'));
const projectFiles = await readFrontmatterDirectory(resolve(root, 'src/content/projects'));
const projects = new Map(projectFiles.map(({ data }) => [data.slug, data]));
const failures = [];
const warnings = [];

if (manifest.schemaVersion !== 1) failures.push('Hub media manifest schemaVersion must be 1.');
if (manifest.width !== 1440 || manifest.height !== 900) failures.push(`Hub media must remain 1440x900; manifest is ${manifest.width}x${manifest.height}.`);
if (manifest.format !== 'webp') failures.push(`Hub media format must be webp, received ${manifest.format}.`);

const expectedSlugs = hub.projects.map((entry) => entry.slug);
const captureSlugs = Object.keys(manifest.captures ?? {});
if (captureSlugs.length !== hub.expectedCount) failures.push(`Hub media manifest must contain exactly ${hub.expectedCount} captures; found ${captureSlugs.length}.`);

for (const slug of expectedSlugs) {
  const capture = manifest.captures?.[slug];
  const project = projects.get(slug);
  if (!capture) {
    failures.push(`${slug}: canonical Hub screenshot missing from manifest.`);
    continue;
  }
  if (!project?.liveUrl) failures.push(`${slug}: project liveUrl missing while validating Hub media.`);
  else if (capture.url !== project.liveUrl) failures.push(`${slug}: screenshot source URL ${capture.url} does not match project liveUrl ${project.liveUrl}.`);

  const expectedFile = `/src/assets/hub/${slug}.webp`;
  if (capture.file !== expectedFile) failures.push(`${slug}: expected media path ${expectedFile}, received ${capture.file}.`);
  const diskPath = resolve(root, expectedFile.replace(/^\//, ''));
  try {
    const info = await stat(diskPath);
    if (info.size !== capture.bytes) failures.push(`${slug}: manifest byte count ${capture.bytes} does not match file size ${info.size}.`);
    if (info.size > 250 * 1024) failures.push(`${slug}: Hub screenshot exceeds 250 KB hard limit (${Math.round(info.size / 1024)} KB).`);
    else if (info.size > 150 * 1024) warnings.push(`${slug}: Hub screenshot exceeds 150 KB target (${Math.round(info.size / 1024)} KB).`);
    const header = await readFile(diskPath);
    if (header.length < 12 || header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WEBP') {
      failures.push(`${slug}: canonical Hub screenshot is not a valid WebP container.`);
    }
  } catch (error) {
    failures.push(`${slug}: canonical Hub screenshot file is missing (${error instanceof Error ? error.message : String(error)}).`);
  }
}

for (const slug of captureSlugs) {
  if (!expectedSlugs.includes(slug)) failures.push(`${slug}: media manifest contains a capture for an app outside the locked Hub.`);
}

if (failures.length) {
  console.error('Hub media validation failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Hub media validation passed: ${captureSlugs.length}/${hub.expectedCount} canonical 1440x900 WebP captures.`);
warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
