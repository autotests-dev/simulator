import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { config } from '../packages/config/src';

// Guards docs/whats-deployed.md against drift: every seeded account must be documented,
// so editing the config can't silently leave the published known-inputs stale.
test('every configured account is documented in whats-deployed.md', () => {
  const doc = readFileSync('docs/whats-deployed.md', 'utf8');
  const undocumented = config.profiles.map((p) => p.email).filter((email) => !doc.includes(email));
  expect(
    undocumented,
    `undocumented accounts in docs/whats-deployed.md: ${undocumented.join(', ')}`,
  ).toEqual([]);
});
