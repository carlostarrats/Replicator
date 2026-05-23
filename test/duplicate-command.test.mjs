import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startLocalVercelApiSimulator } from './helpers/local-vercel-api-simulator.mjs';

test('duplicate dry-run prints a safe copy plan without mutating projects', async () => {
  const api = await startLocalVercelApiSimulator();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-duplicate-'));

  try {
    await writeFile(join(dir, 'vercel.json'), JSON.stringify({
      crons: [{ path: '/api/sync', schedule: '0 5 * * *' }],
    }));

    const result = await runCli([
      'duplicate',
      '--from',
      'brand-a-web',
      '--to',
      'brand-c-web',
      '--api-base',
      api.apiBase,
      '--code-root',
      dir,
      '--dry-run',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Duplicate plan for brand-c-web/);
    assert.match(result.stdout, /This will:/);
    assert.match(result.stdout, /Create project brand-c-web/);
    assert.match(result.stdout, /Copy build settings/);
    assert.match(result.stdout, /Create environment variable placeholders for 4 keys/);
    assert.match(result.stdout, /This will not:/);
    assert.match(result.stdout, /Copy secret values/);
    assert.match(result.stdout, /Move domains/);
    assert.match(result.stdout, /Manual review needed:/);
    assert.match(result.stdout, /2 domain\(s\) detected but not copied/);
    assert.match(result.stdout, /1 cron job\(s\) detected in vercel\.json/);
    assert.ok(api.requests.every((request) => request.method === 'GET'));
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('duplicate dry-run can export JSON copy plan', async () => {
  const api = await startLocalVercelApiSimulator();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-duplicate-json-'));
  const out = join(dir, 'duplicate.json');

  try {
    const result = await runCli([
      'duplicate',
      '--from',
      'brand-a-web',
      '--to',
      'brand-c-web',
      '--api-base',
      api.apiBase,
      '--dry-run',
      '--format',
      'json',
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(report.targetProjectName, 'brand-c-web');
    assert.deepEqual(report.envKeys, ['BLOB_READ_WRITE_TOKEN', 'DATABASE_URL', 'NEXT_PUBLIC_APP_URL', 'OPENAI_API_KEY']);
    assert.ok(report.manualReview.includes('2 domain(s) detected but not copied'));
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('duplicate apply creates a project and leaves secret values for manual entry', async () => {
  const api = await startLocalVercelApiSimulator();

  try {
    const result = await runCli([
      'duplicate',
      '--from',
      'brand-a-web',
      '--to',
      'brand-c-web',
      '--api-base',
      api.apiBase,
      '--apply',
      '--yes',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Duplicate created/);
    assert.match(result.stdout, /New project: brand-c-web/);
    assert.match(result.stdout, /Copied:/);
    assert.match(result.stdout, /Build settings/);
    assert.match(result.stdout, /Missing values checklist:/);
    assert.match(result.stdout, /vercel env add DATABASE_URL production/);
    assert.match(result.stdout, /vercel env add DATABASE_URL preview/);

    const createRequest = api.requests.find((request) => request.method === 'POST' && request.url === '/v10/projects');
    assert.equal(createRequest.body.name, 'brand-c-web');
    assert.equal(createRequest.body.framework, 'nextjs');
    assert.equal(createRequest.body.buildCommand, 'pnpm build');
    assert.equal(createRequest.body.devCommand, 'pnpm dev');
    assert.equal(createRequest.body.rootDirectory, 'apps/web');
    assert.equal(api.requests.some((request) => request.method === 'POST' && request.url.includes('/env')), false);
  } finally {
    await api.close();
  }
});

test('duplicate apply JSON output sanitizes created project metadata', async () => {
  const api = await startLocalVercelApiSimulator();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-apply-json-'));
  const out = join(dir, 'created.json');

  try {
    const result = await runCli([
      'duplicate',
      '--from',
      'brand-a-web',
      '--to',
      'brand-c-web',
      '--api-base',
      api.apiBase,
      '--apply',
      '--yes',
      '--format',
      'json',
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(report.createdProject.name, 'brand-c-web');
    assert.equal(report.createdProject.id, 'prj_789');
    assert.equal(report.createdProject.accountId, undefined);
    assert.equal(report.createdProject.features, undefined);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

