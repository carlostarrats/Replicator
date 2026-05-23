import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('quiet suppresses success chatter for local viewer command', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-quiet-'));

  try {
    const result = await runCli(['viewer', '--out', join(dir, 'viewer.html'), '--quiet'], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, '');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('verbose prints command category', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-verbose-'));

  try {
    const result = await runCli(['viewer', '--out', join(dir, 'viewer.html'), '--verbose'], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stderr, /permission: local-only/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
