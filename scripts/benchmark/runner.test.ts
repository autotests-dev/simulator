import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { classify } from './report';
import { runProcess } from './process';
import { verifyBuild, writeBuildManifest } from './metadata';

const root = fileURLToPath(new URL('../../', import.meta.url));
const successful = { exitCode: 0, signal: null, timedOut: false, interrupted: false };

test('missing reports, skips, flaky results, timeouts and interruptions cannot pass', () => {
  const stats = { expected: 1, unexpected: 0, skipped: 0, flaky: 0 };
  assert.equal(classify(successful, stats), 'passed');
  assert.equal(classify(successful), 'error');
  assert.equal(classify(successful, { ...stats, skipped: 1 }), 'incomplete');
  assert.equal(classify(successful, { ...stats, expected: 0 }), 'incomplete');
  assert.equal(classify(successful, { ...stats, flaky: 1 }), 'failed');
  assert.equal(classify({ ...successful, timedOut: true }, stats), 'timed-out');
  assert.equal(classify({ ...successful, interrupted: true }, stats), 'interrupted');
  assert.equal(classify({ ...successful, exitCode: 1 }, stats), 'failed');
});

test('build identity rejects edited static files and changed config fingerprints', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'simulator-identity-'));
  try {
    await mkdir(path.join(scratch, 'apps/site/dist'), { recursive: true });
    await writeFile(path.join(scratch, 'package.json'), '{"version":"1.0.0"}');
    await writeFile(path.join(scratch, 'pnpm-lock.yaml'), 'test lockfile');
    await writeFile(path.join(scratch, 'apps/site/dist/index.html'), '<p>original</p>');
    await writeBuildManifest(scratch);
    const original = await verifyBuild(scratch);
    assert.equal(original.commit, null);
    await writeFile(path.join(scratch, 'apps/site/dist/index.html'), '<p>edited</p>');
    await assert.rejects(verifyBuild(scratch), /does not match/);
    await writeFile(path.join(scratch, 'apps/site/dist/index.html'), '<p>original</p>');
    await writeFile(
      path.join(scratch, 'artifacts/benchmark-build.json'),
      JSON.stringify({ ...original, configSha256: 'other' }),
    );
    await assert.rejects(verifyBuild(scratch), /does not match/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('a hung process and its descendants are killed even when they ignore SIGTERM', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'simulator-timeout-'));
  try {
    const heartbeat = path.join(scratch, 'heartbeat');
    const descendant = `const fs = require('node:fs'); process.on('SIGTERM',()=>{}); setInterval(()=>fs.appendFileSync(${JSON.stringify(heartbeat)}, '.'), 20);`;
    const parent = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], { stdio: 'ignore' }); process.on('SIGTERM',()=>{}); setInterval(()=>{}, 1000);`;
    const result = await runProcess(process.execPath, ['-e', parent], {
      cwd: root,
      env: process.env,
      log: path.join(scratch, 'log'),
      timeoutMs: 300,
    });
    assert.equal(result.timedOut, true);
    assert.equal(result.signal, 'SIGKILL');
    const finalHeartbeat = await readFile(heartbeat, 'utf8');
    assert.ok(finalHeartbeat.length > 0);
    await delay(100);
    assert.equal(await readFile(heartbeat, 'utf8'), finalHeartbeat);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

for (const mode of ['failure', 'skip', 'hang'] as const) {
  test(`the CLI saves evidence and exits nonzero for ${mode}`, { timeout: 60_000 }, async () => {
    const scratch = await mkdtemp(path.join(tmpdir(), 'simulator-runner-'));
    try {
      const suite = path.join(scratch, 'suite');
      const output = path.join(scratch, 'output');
      await mkdir(suite);
      const body =
        mode === 'failure'
          ? "test('account input', () => { expect(process.env.SIMULATOR_ACCOUNT_ID).toBe('prof-ays'); });"
          : mode === 'skip'
            ? "test.skip('skipped', () => {});"
            : "test('hung', async () => { test.setTimeout(0); await new Promise(() => {}); });";
      await writeFile(
        path.join(suite, 'fixture.spec.mjs'),
        `import { test, expect } from ${JSON.stringify(import.meta.resolve('@playwright/test'))};\n${body}\n`,
      );
      const result = await runProcess(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/benchmark/run.ts',
          '--suite',
          suite,
          '--accounts',
          mode === 'failure' ? 'prof-demo,prof-ays' : 'prof-demo',
          '--output',
          output,
          '--timeout-ms',
          mode === 'hang' ? '1500' : '20000',
        ],
        {
          cwd: root,
          env: process.env,
          log: path.join(scratch, 'cli.log'),
          timeoutMs: 50_000,
        },
      );
      assert.equal(result.exitCode, 1, await readFile(path.join(scratch, 'cli.log'), 'utf8'));
      const report = JSON.parse(await readFile(path.join(output, 'results.json'), 'utf8'));
      assert.equal(report.completed, true);
      assert.equal(
        report.rows[0].status,
        { failure: 'failed', skip: 'incomplete', hang: 'timed-out' }[mode],
        await readFile(path.join(output, report.rows[0].directory, 'run.log'), 'utf8'),
      );
      if (mode === 'failure') assert.equal(report.rows[1].status, 'passed');
      assert.match(
        await readFile(path.join(output, 'results.md'), 'utf8'),
        /Account matrix results/,
      );
      assert.equal(report.suite.sha256.length, 64);
      assert.ok(report.rows[0].browserVersion);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
}

test(
  'interrupting a running suite preserves an incomplete comparison',
  { timeout: 30_000 },
  async () => {
    const scratch = await mkdtemp(path.join(tmpdir(), 'simulator-interrupt-'));
    const controller = new AbortController();
    let running: ReturnType<typeof runProcess> | undefined;
    try {
      const suite = path.join(scratch, 'suite');
      const output = path.join(scratch, 'output');
      const marker = path.join(scratch, 'started');
      await mkdir(suite);
      await writeFile(
        path.join(suite, 'fixture.spec.mjs'),
        `
      import { test } from ${JSON.stringify(import.meta.resolve('@playwright/test'))};
      import { writeFileSync } from 'node:fs';
      test('interrupted', async () => {
        test.setTimeout(0);
        writeFileSync(${JSON.stringify(marker)}, 'started');
        await new Promise(() => {});
      });
    `,
      );
      running = runProcess(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/benchmark/run.ts',
          '--suite',
          suite,
          '--accounts',
          'prof-demo',
          '--output',
          output,
        ],
        {
          cwd: root,
          env: process.env,
          log: path.join(scratch, 'cli.log'),
          timeoutMs: 25_000,
          signal: controller.signal,
        },
      );
      const deadline = performance.now() + 15_000;
      while (true) {
        try {
          await readFile(marker);
          break;
        } catch {
          /* Wait until the suite is running. */
        }
        assert.ok(performance.now() < deadline, 'Fixture did not start');
        await delay(50);
      }
      controller.abort();
      assert.equal((await running).exitCode, 130);
      const report = JSON.parse(await readFile(path.join(output, 'results.json'), 'utf8'));
      assert.equal(report.completed, false);
      assert.equal(report.rows[0].status, 'interrupted');
    } finally {
      controller.abort();
      await running;
      await rm(scratch, { recursive: true, force: true });
    }
  },
);
