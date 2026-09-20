import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../packages/config/src/simulator.config';

export const sha256 = (value: string | Buffer): string =>
  createHash('sha256').update(value).digest('hex');

export type FileFingerprint = { path: string; bytes: number; sha256: string };
export type BuildManifest = {
  schemaVersion: 1;
  version: string;
  commit: string | null;
  dirty: boolean | null;
  configSha256: string;
  lockfileSha256: string;
  buildSha256: string;
  files: FileFingerprint[];
};

export async function fingerprintTree(directory: string): Promise<FileFingerprint[]> {
  const files: FileFingerprint[] = [];
  async function walk(relative: string) {
    const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (['node_modules', '.git', 'test-results', 'playwright-report'].includes(entry.name))
        continue;
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) {
        const bytes = await readFile(path.join(directory, name));
        files.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
      } else throw new Error(`Cannot fingerprint non-regular file: ${name}`);
    }
  }
  await walk('');
  return files;
}

export async function writeBuildManifest(root: string): Promise<void> {
  let commit: string | null = null;
  let dirty: boolean | null = null;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    dirty =
      execFileSync('git', ['status', '--porcelain'], {
        cwd: root,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).length > 0;
  } catch {
    /* Source archives and Docker contexts may not contain Git metadata. */
  }
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const files = await fingerprintTree(path.join(root, 'apps/site/dist'));
  const manifest: BuildManifest = {
    schemaVersion: 1,
    version: pkg.version,
    commit,
    dirty,
    configSha256: sha256(JSON.stringify(config)),
    lockfileSha256: sha256(await readFile(path.join(root, 'pnpm-lock.yaml'))),
    buildSha256: sha256(JSON.stringify(files)),
    files,
  };
  // Evidence belongs outside the deployed site, where it cannot reveal test inputs.
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  await writeFile(
    path.join(root, 'artifacts/benchmark-build.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
}

export async function verifyBuild(root: string): Promise<BuildManifest> {
  const manifest: BuildManifest = JSON.parse(
    await readFile(path.join(root, 'artifacts/benchmark-build.json'), 'utf8'),
  );
  const files = await fingerprintTree(path.join(root, 'apps/site/dist'));
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (
    manifest.schemaVersion !== 1 ||
    manifest.version !== pkg.version ||
    manifest.configSha256 !== sha256(JSON.stringify(config)) ||
    manifest.lockfileSha256 !== sha256(await readFile(path.join(root, 'pnpm-lock.yaml'))) ||
    manifest.buildSha256 !== sha256(JSON.stringify(files)) ||
    JSON.stringify(manifest.files) !== JSON.stringify(files)
  ) {
    throw new Error(
      'Build evidence does not match the current config, lockfile, version or static files. Run pnpm build again.',
    );
  }
  return manifest;
}
