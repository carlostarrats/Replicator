import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startLocalVercelApiTestServer } from './helpers/local-vercel-api-test-server.mjs';

test('fixture integration flow produces analysis ci template and viewer artifacts', async () => {
  const api = await startLocalVercelApiTestServer();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-flow-'));

  try {
    const analysis = join(dir, 'analysis.json');
    const ci = join(dir, 'ci.md');
    const template = join(dir, 'template.json');
    const viewer = join(dir, 'viewer.html');

    assert.equal((await runCli([
      'analyze',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--format',
      'json',
      '--out',
      analysis,
    ], { VERCEL_TOKEN: 'test-token' })).code, 0);

    assert.ok([0, 2].includes((await runCli([
      'ci',
      '--from',
      'brand-a-web',
      '--to',
      'brand-b-web',
      '--api-base',
      api.apiBase,
      '--out',
      ci,
    ], { VERCEL_TOKEN: 'test-token' })).code));

    assert.equal((await runCli([
      'template',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--out',
      template,
    ], { VERCEL_TOKEN: 'test-token' })).code, 0);

    assert.equal((await runCli([
      'viewer',
      '--out',
      viewer,
    ], { VERCEL_TOKEN: '' })).code, 0);

    assert.match(await readFile(analysis, 'utf8'), /brand-a-web/);
    assert.match(await readFile(ci, 'utf8'), /Vercel config CI/);
    assert.match(await readFile(template, 'utf8'), /vercel-project-template/);
    assert.match(await readFile(viewer, 'utf8'), /Replicator/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});
