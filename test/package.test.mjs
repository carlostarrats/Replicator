import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('package exposes vcopy bin and version', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));

  assert.equal(pkg.bin.vcopy, './src/cli.mjs');
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
});

test('cli prints package version', async () => {
  const result = await runCli(['--version'], { VERCEL_TOKEN: '' });

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /0\.1\.0/);
});
