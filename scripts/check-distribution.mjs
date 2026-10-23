import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'dist/manifest.json'), 'utf8'));
const failures = [];
for (const entry of manifest.files) {
  const target = path.resolve(root, entry.path);
  if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('Invalid manifest path');
  try {
    const bytes = await readFile(target);
    if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) failures.push(entry.path);
  } catch { failures.push(entry.path); }
}
console.log(`${manifest.files.length} distribution files checked; ${failures.length} failures.`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
