import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startDestructiveFakeApi } from './helpers/fake-vercel-api.mjs';

test('template-apply creates only vcopy-test projects through fake API', async () => {
  const api = await startDestructiveFakeApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-template-apply-'));

  try {
    const template = join(dir, 'template.json');
    await writeFile(template, JSON.stringify({
      kind: 'vercel-project-template',
      project: { framework: 'nextjs', rootDirectory: 'apps/web' },
      env: [{ key: 'DATABASE_URL', target: ['preview'], type: 'encrypted' }],
    }));

    const result = await runCli([
      'template-apply',
      '--template',
      template,
      '--to',
      'vcopy-test-template-target',
      '--api-base',
      api.apiBase,
      '--test-project-only',
      '--apply',
      '--yes',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Template applied/);
    assert.match(result.stdout, /DATABASE_URL/);
    assert.ok(api.requests.some((request) => request.method === 'POST' && request.url === '/v10/projects'));
    assert.equal(api.requests.some((request) => request.url.includes('/env')), false);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('template-apply refuses non-test target projects', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-template-apply-refuse-'));

  try {
    const template = join(dir, 'template.json');
    await writeFile(template, JSON.stringify({
      kind: 'vercel-project-template',
      project: { framework: 'nextjs' },
      env: [],
    }));

    const result = await runCli([
      'template-apply',
      '--template',
      template,
      '--to',
      'real-project',
      '--test-project-only',
      '--apply',
      '--yes',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 3);
    assert.match(result.stderr, /vcopy-test-/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
