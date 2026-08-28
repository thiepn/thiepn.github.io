import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS, readProjects } from './lib/catalogue-files.mjs';

const projects = await readProjects();
const failures = [];
const warnings = [];
const size = async (file) => { try { return (await fs.stat(file)).size; } catch { return null; } };

for (const { data } of projects) {
  const source = data.preview?.source;
  if (data.preview?.type === 'video') {
    if (!source) failures.push(`${data.slug}: video preview requires preview.source.`);
    if (source?.startsWith('/')) {
      const file = path.join(PATHS.public, source.slice(1));
      const bytes = await size(file);
      if (bytes == null) failures.push(`${data.slug}: missing video source ${source}.`);
      else if (bytes > 3 * 1024 * 1024) failures.push(`${data.slug}: preview video exceeds 3 MB hard limit (${(bytes / 1024 / 1024).toFixed(2)} MB).`);
      else if (bytes > 1.5 * 1024 * 1024) warnings.push(`${data.slug}: preview video exceeds 1.5 MB target (${(bytes / 1024 / 1024).toFixed(2)} MB).`);
    }
  }

  const directory = path.join(PATHS.public, 'projects', data.slug);
  const captureBytes = await size(path.join(directory, 'capture.jpg'));
  if (captureBytes != null) {
    if (captureBytes > 1024 * 1024) failures.push(`${data.slug}: authentic capture.jpg exceeds 1 MB hard limit.`);
    else if (captureBytes > 350 * 1024) warnings.push(`${data.slug}: authentic capture.jpg exceeds 350 KB target (${(captureBytes / 1024).toFixed(0)} KB).`);
  }

  for (const name of ['poster-960.webp', 'poster-480.webp']) {
    const file = path.join(directory, name);
    const bytes = await size(file);
    if (bytes == null) continue;
    if (bytes > 1024 * 1024) failures.push(`${data.slug}: ${name} exceeds 1 MB hard limit.`);
    else if (bytes > 300 * 1024) warnings.push(`${data.slug}: ${name} exceeds 300 KB target.`);
  }

  if (data.visibility === 'listed' && Number(String(data.preview?.tier || 'P0').slice(1)) >= 3) {
    const hasPoster = Boolean(data.preview.poster)
      || captureBytes != null
      || (await size(path.join(directory, 'poster-960.webp'))) != null;
    if (!hasPoster && data.preview.type === 'static') warnings.push(`${data.slug}: P3+ static preview has no authentic or optimized poster media.`);
  }
}

if (failures.length) {
  console.error('Media validation failed:\n');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Media validation passed${warnings.length ? ` with ${warnings.length} warning(s)` : ''}.`);
warnings.forEach((item) => console.warn(`Warning: ${item}`));
