import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('package exposes vcopy bin and version', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));

  assert.equal(pkg.description, 'Replicator, a Vercel config manager for safe project analysis, drift checks, and migration handoff workflows.');
  assert.equal(pkg.bin.vcopy, './src/cli.mjs');
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.private, false);
  assert.equal(pkg.license, 'MIT');
});

test('cli prints package version', async () => {
  const result = await runCli(['--version'], { VERCEL_TOKEN: '' });

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /0\.1\.0/);
});

test('cli help uses Replicator product name with descriptive copy', async () => {
  const result = await runCli(['--help'], { VERCEL_TOKEN: '' });

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Replicator/);
  assert.match(result.stdout, /Vercel config manager/i);
});
