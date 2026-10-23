import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import archiver from 'archiver';

const root = fileURLToPath(new URL('../', import.meta.url));
const name = 'tq-bootstrap-1.0.0-standalone.zip';
await mkdir(path.join(root, 'release'), { recursive: true });
const output = path.join(root, 'release', name);
await new Promise((resolve, reject) => {
  const stream = createWriteStream(output);
  const zip = archiver('zip', { zlib: { level: 9 } });
  stream.on('close', resolve); stream.on('error', reject);
  zip.on('warning', reject); zip.on('error', reject); zip.pipe(stream);
  for (const dir of ['dist', 'assets/bootstrap-icons', 'lessons/typography', 'src', 'upstream/bootstrap']) zip.directory(path.join(root, dir), dir);
  for (const file of ['starter.html', 'START-HERE.md', 'LICENSE', 'THIRD-PARTY-NOTICES.md', 'docs/INTEGRATION.md', 'scripts/check-distribution.mjs', 'scripts/serve.mjs']) zip.file(path.join(root, file), { name: file });
  zip.finalize();
});
const bytes = await readFile(output);
await writeFile(output + '.sha256', createHash('sha256').update(bytes).digest('hex') + '  ' + name + '\n');
console.log(`Created ${name} (${bytes.length} bytes).`);
