import type { ProcessResult } from './process';

export type Stats = { expected: number; unexpected: number; skipped: number; flaky: number };
export type Row = {
  account: string;
  email: string;
  browser: string;
  browserVersion?: string;
  status: 'not-run' | 'passed' | 'failed' | 'timed-out' | 'interrupted' | 'error' | 'incomplete';
  durationMs?: number;
  stats?: Stats;
  process?: ProcessResult;
  error?: string;
  directory: string;
};

export function classify(result: ProcessResult, stats?: Stats): Row['status'] {
  if (result.interrupted) return 'interrupted';
  if (result.timedOut) return 'timed-out';
  if (result.exitCode !== 0) return 'failed';
  if (!stats) return 'error';
  if (stats.unexpected || stats.flaky) return 'failed';
  if (!stats.expected || stats.skipped) return 'incomplete';
  return 'passed';
}

export function markdown(
  rows: Row[],
  identity: { version: string; buildSha256: string },
  suiteHash: string,
): string {
  return [
    '# Account matrix results',
    '',
    `Simulator ${identity.version}; build SHA-256: \`${identity.buildSha256}\`.`,
    `Suite SHA-256: \`${suiteHash}\`.`,
    '',
    '| Account | Browser | Result | Expected | Unexpected | Skipped | Seconds | Evidence |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
    ...rows.map(
      (row) =>
        `| ${row.account} | ${row.browser} ${row.browserVersion ?? ''} | ${row.status} | ${row.stats?.expected ?? '—'} | ${row.stats?.unexpected ?? '—'} | ${row.stats?.skipped ?? '—'} | ${row.durationMs === undefined ? '—' : (row.durationMs / 1000).toFixed(1)} | [log](${row.directory}/run.log) |`,
    ),
    '',
    'Failures under adverse accounts are evidence for review, not an automatic quality score.',
    '',
  ].join('\n');
}
