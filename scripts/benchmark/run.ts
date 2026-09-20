import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { chromium, firefox, webkit } from '@playwright/test';
import { config } from '../../packages/config/src/simulator.config';
import { fingerprintTree, sha256, verifyBuild } from './metadata';
import { runProcess } from './process';
import { serveBuild } from './server';
import { classify, markdown, type Row, type Stats } from './report';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
const engines = { chromium, firefox, webkit };
const defaults = ['prof-demo', 'prof-ays', 'prof-noor', 'prof-lena', 'prof-marc', 'prof-tomas'];
const { values } = parseArgs({
  options: {
    suite: { type: 'string' },
    accounts: { type: 'string', default: defaults.join(',') },
    browsers: { type: 'string', default: 'chromium' },
    output: { type: 'string' },
    'timeout-ms': { type: 'string', default: '120000' },
    help: { type: 'boolean' },
  },
});

if (values.help) {
  console.log(
    'pnpm benchmark --suite <directory> [--accounts prof-demo,prof-ays|all] [--browsers chromium,firefox,webkit] [--timeout-ms 120000] [--output directory]',
  );
} else {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

async function main() {
  if (!values.suite)
    throw new Error('--suite must name a directory containing parametrized Playwright specs.');
  if (process.platform === 'win32')
    throw new Error(
      'The matrix runner requires Linux or macOS process-group cleanup. Use WSL on Windows.',
    );
  const timeoutMs = Number(values['timeout-ms']);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 3_600_000)
    throw new Error('--timeout-ms must be an integer between 1000 and 3600000.');
  const ids = [
    ...new Set(
      values.accounts === 'all' ? config.profiles.map((p) => p.id) : values.accounts!.split(','),
    ),
  ];
  const profiles = ids.map((id) => {
    const profile = config.profiles.find((p) => p.id === id);
    if (!profile) throw new Error(`Unknown account: ${id}`);
    return profile;
  });
  const browsers = [...new Set(values.browsers!.split(','))].map((name) => {
    if (!Object.hasOwn(engines, name)) throw new Error(`Unknown browser: ${name}`);
    return name as keyof typeof engines;
  });
  const suite = path.resolve(values.suite);
  const output = path.resolve(
    values.output ??
      path.join(root, 'artifacts', `matrix-${new Date().toISOString().replaceAll(':', '-')}`),
  );
  const relativeOutput = path.relative(suite, output);
  if (!relativeOutput.startsWith('..' + path.sep) && !path.isAbsolute(relativeOutput))
    throw new Error('Output must be outside the suite directory.');
  const build = await verifyBuild(root);
  const suiteFiles = await fingerprintTree(suite);
  if (!suiteFiles.some((file) => /\.spec\.(?:ts|js|mts|mjs)$/.test(file.path)))
    throw new Error('No Playwright specs found in --suite.');
  const suiteSha256 = sha256(JSON.stringify(suiteFiles));
  // Refuse to overwrite an earlier comparison, including a partially completed one.
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output);
  const snapshot = path.join(output, 'site');
  await cp(path.join(root, 'apps/site/dist'), snapshot, { recursive: true });
  if (sha256(JSON.stringify(await fingerprintTree(snapshot))) !== build.buildSha256)
    throw new Error('Static build changed while taking the benchmark snapshot.');
  const rows: Row[] = profiles.flatMap((profile) =>
    browsers.map((browser) => ({
      account: profile.id,
      email: profile.email,
      browser,
      status: 'not-run',
      directory: `${profiles.indexOf(profile) + 1}-${profile.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-${browser}`,
    })),
  );
  const evidence = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    completed: false,
    invalidated: null as string | null,
    build,
    suite: { directory: suite, sha256: suiteSha256, files: suiteFiles },
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      playwright: require('@playwright/test/package.json').version,
      timezone: 'UTC',
      locale: 'en-US',
      viewport: { width: 1280, height: 720 },
      retries: 0,
      workers: 1,
      timeoutMs,
    },
    rows,
  };
  const save = async () => {
    await writeFile(
      path.join(output, 'results.json.tmp'),
      JSON.stringify(evidence, null, 2) + '\n',
    );
    await rename(path.join(output, 'results.json.tmp'), path.join(output, 'results.json'));
    await writeFile(
      path.join(output, 'results.md.tmp'),
      (evidence.invalidated ? `Run invalidated: ${evidence.invalidated}\n\n` : '') +
        markdown(rows, build, suiteSha256),
    );
    await rename(path.join(output, 'results.md.tmp'), path.join(output, 'results.md'));
  };
  await save();
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  const server = await serveBuild(snapshot);
  const versions = new Map<string, string>();
  try {
    for (const row of rows) {
      if (controller.signal.aborted) break;
      const directory = path.join(output, row.directory);
      await mkdir(directory);
      const started = performance.now();
      try {
        if (!versions.has(row.browser)) {
          const browser = await engines[row.browser as keyof typeof engines].launch({
            timeout: 15_000,
          });
          versions.set(row.browser, browser.version());
          await browser.close();
        }
        row.browserVersion = versions.get(row.browser);
        const profile = profiles.find((profile) => profile.id === row.account)!;
        row.process = await runProcess(
          process.execPath,
          [
            require.resolve('@playwright/test/cli'),
            'test',
            '--config',
            path.join(root, 'scripts/benchmark/playwright.config.ts'),
          ],
          {
            cwd: root,
            timeoutMs,
            log: path.join(directory, 'run.log'),
            signal: controller.signal,
            env: {
              ...process.env,
              SIMULATOR_SUITE: suite,
              SIMULATOR_BASE_URL: server.baseURL,
              SIMULATOR_BROWSER: row.browser,
              SIMULATOR_ACCOUNT_ID: profile.id,
              SIMULATOR_ACCOUNT_EMAIL: profile.email,
              SIMULATOR_ACCOUNT_PASSWORD: profile.password,
              SIMULATOR_TEST_OUTPUT: path.join(directory, 'test-results'),
              SIMULATOR_JSON_REPORT: path.join(directory, 'playwright.json'),
            },
          },
        );
        try {
          const report = JSON.parse(
            await readFile(path.join(directory, 'playwright.json'), 'utf8'),
          );
          const stats = report.stats as Stats;
          if (
            !stats ||
            !['expected', 'unexpected', 'skipped', 'flaky'].every(
              (key) =>
                Number.isInteger(stats[key as keyof Stats]) && stats[key as keyof Stats] >= 0,
            )
          )
            throw new Error('Invalid Playwright statistics');
          row.stats = stats;
        } catch (error) {
          row.error = `No complete JSON report: ${String(error)}`;
        }
        row.status = classify(row.process, row.stats);
      } catch (error) {
        row.status = 'error';
        row.error = String(error);
        await writeFile(path.join(directory, 'run.log'), row.error + '\n');
      }
      row.durationMs = Math.round(performance.now() - started);
      console.log(`${row.account} / ${row.browser}: ${row.status}`);
      await save();
    }
    evidence.completed =
      !controller.signal.aborted && rows.every((row) => row.status !== 'not-run');
    if (sha256(JSON.stringify(await fingerprintTree(suite))) !== suiteSha256) {
      evidence.invalidated = 'Suite files changed during the run; repeat with a stable suite.';
      evidence.completed = false;
    }
  } finally {
    await save();
    await server.close();
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
  console.log(`Results: ${path.join(output, 'results.md')}`);
  if (controller.signal.aborted) process.exitCode = 130;
  else if (evidence.invalidated || rows.some((row) => row.status !== 'passed'))
    process.exitCode = 1;
}
