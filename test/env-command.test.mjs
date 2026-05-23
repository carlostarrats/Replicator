import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startFakeVercelApi } from './helpers/fake-vercel-api.mjs';

test('env-template exports env names without secret values', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-env-template-'));
  const out = join(dir, '.env.example');

  try {
    const result = await runCli([
      'env-template',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    const template = await readFile(out, 'utf8');
    assert.match(template, /DATABASE_URL=/);
    assert.match(template, /NEXT_PUBLIC_APP_URL=/);
    assert.match(template, /OPENAI_API_KEY=/);
    assert.doesNotMatch(template, /test-token/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('template exports reusable project config without secret values', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-template-'));
  const out = join(dir, 'template.json');

  try {
    const result = await runCli([
      'template',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    const template = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(template.kind, 'vercel-project-template');
    assert.equal(template.project.framework, 'nextjs');
    assert.equal(template.project.rootDirectory, 'apps/web');
    assert.deepEqual(template.env, [
      { key: 'BLOB_READ_WRITE_TOKEN', target: ['production'], type: 'encrypted' },
      { key: 'DATABASE_URL', target: ['preview', 'production'], type: 'encrypted' },
      { key: 'NEXT_PUBLIC_APP_URL', target: ['development', 'preview', 'production'], type: 'plain' },
      { key: 'OPENAI_API_KEY', target: ['preview', 'production'], type: 'encrypted' },
    ]);
    assert.match(template.manualReview[0], /Domains are not included/);
    assert.doesNotMatch(JSON.stringify(template), /encrypted-payload/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('template-plan previews a local template without Vercel auth or mutations', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-template-plan-'));
  const templatePath = join(dir, 'template.json');

  try {
    await writeFile(templatePath, JSON.stringify({
      kind: 'vercel-project-template',
      version: 1,
      sourceProject: 'brand-a-web',
      project: {
        framework: 'nextjs',
        rootDirectory: 'apps/web',
        installCommand: 'pnpm install',
        buildCommand: 'pnpm build',
        outputDirectory: '.next',
      },
      env: [
        { key: 'DATABASE_URL', target: ['preview', 'production'], type: 'encrypted' },
        { key: 'NEXT_PUBLIC_APP_URL', target: ['preview', 'production'], type: 'plain' },
      ],
      manualReview: [
        'Domains are not included and must be reviewed manually.',
      ],
    }));

    const result = await runCli([
      'template-plan',
      '--template',
      templatePath,
      '--to',
      'brand-c-web',
    ], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Template plan for brand-c-web/);
    assert.match(result.stdout, /Source template: brand-a-web/);
    assert.match(result.stdout, /framework: nextjs/);
    assert.match(result.stdout, /DATABASE_URL - preview, production/);
    assert.match(result.stdout, /This command does not call Vercel or create projects/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});


test('env-push dry-run previews selected local env values without printing secrets', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-env-push-'));
  const envFile = join(dir, '.env');

  try {
    await writeFile(envFile, [
      'DATABASE_URL=postgres://secret',
      'OPENAI_API_KEY=sk-secret',
      '',
    ].join('\n'));

    const result = await runCli([
      'env-push',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--env-file',
      envFile,
      '--keys',
      'DATABASE_URL',
      '--target',
      'preview',
      '--dry-run',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Env push plan/);
    assert.match(result.stdout, /DATABASE_URL - preview/);
    assert.doesNotMatch(result.stdout, /postgres:\/\/secret/);
    assert.equal(api.requests.some((request) => request.method === 'POST' && request.url.includes('/env')), false);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('env-push apply writes selected local env values only with explicit confirmation', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-env-apply-'));
  const envFile = join(dir, '.env');

  try {
    await writeFile(envFile, 'DATABASE_URL=postgres://secret\nOPENAI_API_KEY=sk-secret\n');

    const result = await runCli([
      'env-push',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--env-file',
      envFile,
      '--keys',
      'DATABASE_URL',
      '--target',
      'preview',
      '--apply',
      '--yes',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Env values pushed/);
    assert.doesNotMatch(result.stdout, /postgres:\/\/secret/);

    const envRequest = api.requests.find((request) => request.method === 'POST' && request.url === '/v9/projects/brand-a-web/env');
    assert.equal(envRequest.body.key, 'DATABASE_URL');
    assert.equal(envRequest.body.value, 'postgres://secret');
    assert.deepEqual(envRequest.body.target, ['preview']);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('env-rm dry-run previews matching env vars without deleting', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'env-rm',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--key',
      'BLOB_READ_WRITE_TOKEN',
      '--target',
      'production',
      '--dry-run',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Env remove plan/);
    assert.match(result.stdout, /BLOB_READ_WRITE_TOKEN - production/);
    assert.equal(api.requests.some((request) => request.method === 'DELETE'), false);
  } finally {
    await api.close();
  }
});

test('env-rm apply deletes matching env vars only with explicit confirmation', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'env-rm',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--key',
      'BLOB_READ_WRITE_TOKEN',
      '--target',
      'production',
      '--apply',
      '--yes',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Env values removed/);
    assert.ok(api.requests.some((request) => request.method === 'DELETE' && request.url === '/v9/projects/brand-a-web/env/vq_blob_delete'));
  } finally {
    await api.close();
  }
});

test('env-rm refuses to delete one target from a multi-target env entry', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'env-rm',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--key',
      'DATABASE_URL',
      '--target',
      'preview',
      '--apply',
      '--yes',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Refusing to remove DATABASE_URL for preview/);
    assert.equal(api.requests.some((request) => request.method === 'DELETE'), false);
  } finally {
    await api.close();
  }
});

