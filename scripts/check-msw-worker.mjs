import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const siteRequire = createRequire(new URL('../apps/site/package.json', import.meta.url));
const installed = readFileSync(siteRequire.resolve('msw/mockServiceWorker.js'));
const committed = readFileSync(
  new URL('../apps/site/public/mockServiceWorker.js', import.meta.url),
);

if (!committed.equals(installed)) {
  console.error('The committed MSW worker is stale. Run pnpm msw:init and commit the result.');
  process.exitCode = 1;
} else {
  console.log('The committed MSW worker matches the installed library.');
}
