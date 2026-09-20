import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = fileURLToPath(new URL('../apps/site/dist/', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'));
const entries = Object.values(manifest).filter((chunk) => chunk.isEntry);
const files = new Set();
function collect(chunk) {
  if (files.has(chunk.file)) return;
  files.add(chunk.file);
  for (const key of chunk.imports ?? []) collect(manifest[key]);
}
for (const entry of entries) collect(entry);
let gzipBytes = 0;
for (const file of files) gzipBytes += gzipSync(await readFile(path.join(dist, file))).length;
// Count the complete static import graph, so splitting a vendor chunk cannot
// accidentally make this budget pass. Route/MSW dynamic chunks are reported separately.
const limit = 135 * 1024;
console.log(
  `Initial JavaScript: ${(gzipBytes / 1024).toFixed(1)} KiB gzip (budget ${limit / 1024} KiB)`,
);
const allFiles = new Set(
  Object.values(manifest)
    .map((chunk) => chunk.file)
    .filter((file) => file.endsWith('.js')),
);
let totalBytes = 0;
for (const file of allFiles) totalBytes += gzipSync(await readFile(path.join(dist, file))).length;
console.log(`All JavaScript chunks: ${(totalBytes / 1024).toFixed(1)} KiB gzip`);
if (gzipBytes > limit) {
  console.error(
    'Initial JavaScript exceeds its budget; review eager imports before raising the limit.',
  );
  process.exitCode = 1;
}
