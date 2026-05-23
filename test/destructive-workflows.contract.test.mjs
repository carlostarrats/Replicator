import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { runCli } from './helpers/cli.mjs';
import { startDestructiveFakeApi } from './helpers/fake-vercel-api.mjs';
const FIXTURE_DIR = 'test/fixtures/destructive-workflows';
const FIXTURES = [
  'bulk-secret-migration.json',
  'domain-move.json',
  'integration-credentials.json',
  'deployment-protection.json',
  'cron-rewrite-mutation.json',
];

test('destructive workflow fixtures are scoped to test projects or test files', async () => {
  for (const file of FIXTURES) {
    const fixture = await readFixture(file);
    assert.equal(fixture.destructive, true, `${file} must be marked destructive`);
    assert.ok(Array.isArray(fixture.dryRunCommand), `${file} needs a dry-run command`);
    assert.ok(Array.isArray(fixture.applyCommand), `${file} needs an apply command`);
    assert.ok(fixture.expectedSafety.length > 0, `${file} needs safety expectations`);

    if (fixture.sourceProject) {
      assert.match(fixture.sourceProject, /^vcopy-test-/, `${file} source project must be test-scoped`);
    }
    if (fixture.targetProject) {
      assert.match(fixture.targetProject, /^vcopy-test-/, `${file} target project must be test-scoped`);
    }

    const joinedApply = fixture.applyCommand.join(' ');
    assert.match(joinedApply, /--test-project-only/, `${file} apply must require --test-project-only`);
    assert.match(joinedApply, /--apply/, `${file} apply must require --apply`);
    assert.match(joinedApply, /--yes/, `${file} apply must require --yes`);
  }
});

test('destructive workflow dry runs do not include apply flags', async () => {
  for (const file of FIXTURES) {
    const fixture = await readFixture(file);
    const joinedDryRun = fixture.dryRunCommand.join(' ');
    assert.match(joinedDryRun, /--dry-run/, `${file} dry run must include --dry-run`);
    assert.doesNotMatch(joinedDryRun, /--apply/, `${file} dry run must not include --apply`);
    assert.doesNotMatch(joinedDryRun, /--yes/, `${file} dry run must not include --yes`);
  }
});

test('bulk secret migration writes only selected keys to vcopy-test targets', async () => {
  const api = await startDestructiveFakeApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-secrets-'));
  const envFile = join(dir, '.env');

  try {
    await writeFile(envFile, 'DATABASE_URL=postgres://secret\nOPENAI_API_KEY=sk-secret\n');
    const result = await runCli([
      'secrets-migrate',
      '--from',
      'vcopy-test-source',
      '--to',
      'vcopy-test-target',
      '--api-base',
      api.apiBase,
      '--env-file',
      envFile,
      '--keys',
      'DATABASE_URL',
      '--target',
      'preview',
      '--test-project-only',
      '--apply',
      '--yes',
    ], { VERCEL_TOKEN: 'test-token' });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Secret migration completed/);
    assert.doesNotMatch(result.stdout, /postgres:\/\/secret/);
    const writes = api.requests.filter((request) => request.method === 'POST' && request.url === '/v9/projects/vcopy-test-target/env');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].body.key, 'DATABASE_URL');
    assert.equal(writes[0].body.value, 'postgres://secret');

    const refused = await runCli([
      'secrets-migrate',
      '--from',
      'real-source',
      '--to',
      'vcopy-test-target',
      '--api-base',
      api.apiBase,
      '--env-file',
      envFile,
      '--keys',
      'DATABASE_URL',
      '--target',
      'preview',
      '--test-project-only',
      '--apply',
      '--yes',
    ], { VERCEL_TOKEN: 'test-token' });
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /only vcopy-test-/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('domain move refuses real projects and moves only vcopy-test domains', async () => {
  const api = await startDestructiveFakeApi();

  try {
    const result = await runCli([
      'domain-move',
      '--from',
      'vcopy-test-source',
      '--to',
      'vcopy-test-target',
      '--domain',
      'vcopy-test.example.com',
      '--api-base',
      api.apiBase,
      '--test-project-only',
      '--apply',
      '--yes',
    ], { VERCEL_TOKEN: 'test-token' });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Domain moved/);
    assert.ok(api.requests.some((request) => request.method === 'DELETE' && request.url === '/v9/projects/vcopy-test-source/domains/vcopy-test.example.com'));
    assert.ok(api.requests.some((request) => request.method === 'POST' && request.url === '/v10/projects/vcopy-test-target/domains'));

    const refused = await runCli([
      'domain-move',
      '--from',
      'brand-a-web',
      '--to',
      'vcopy-test-target',
      '--domain',
      'vcopy-test.example.com',
      '--api-base',
      api.apiBase,
      '--test-project-only',
      '--apply',
      '--yes',
    ], { VERCEL_TOKEN: 'test-token' });
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /only vcopy-test-/);
  } finally {
    await api.close();
  }
});

test('integration credential migration emits manual checklist without copying credentials', async () => {
  const api = await startDestructiveFakeApi();

  try {
    const result = await runCli([
      'integration-plan',
      '--from',
      'vcopy-test-source',
      '--to',
      'vcopy-test-target',
      '--api-base',
      api.apiBase,
      '--dry-run',
    ], { VERCEL_TOKEN: 'test-token' });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Integration reconnection checklist/);
    assert.match(result.stdout, /Postgres/);
    assert.match(result.stdout, /Vercel Blob/);
    assert.doesNotMatch(result.stdout, /encrypted-payload/);
    assert.equal(api.requests.some((request) => request.method !== 'GET'), false);
  } finally {
    await api.close();
  }
});

test('deployment protection sync excludes bypass secrets and requires test-project-only apply', async () => {
  const api = await startDestructiveFakeApi();

  try {
    const result = await runCli([
      'protection-sync',
      '--from',
      'vcopy-test-source',
      '--to',
      'vcopy-test-target',
      '--api-base',
      api.apiBase,
      '--test-project-only',
      '--apply',
      '--yes',
    ], { VERCEL_TOKEN: 'test-token' });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Deployment protection synced/);
    const patch = api.requests.find((request) => request.method === 'PATCH' && request.url === '/v9/projects/vcopy-test-target');
    assert.ok(patch);
    assert.equal(patch.body.gitForkProtection, true);
    assert.equal(patch.body.ssoProtection, 'standard');
    assert.equal(patch.body.bypassSecret, undefined);

    const refused = await runCli([
      'protection-sync',
      '--from',
      'vcopy-test-source',
      '--to',
      'brand-b-web',
      '--api-base',
      api.apiBase,
      '--test-project-only',
      '--apply',
      '--yes',
    ], { VERCEL_TOKEN: 'test-token' });
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /only vcopy-test-/);
  } finally {
    await api.close();
  }
});

test('cron and rewrite sync mutates only test fixture config files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-routing-'));
  const source = join(dir, 'source-vercel.json');
  const target = join(dir, 'target-vercel.json');

  try {
    await writeFile(source, JSON.stringify({
      crons: [{ path: '/api/test-sync', schedule: '0 5 * * *' }],
      rewrites: [{ source: '/test-api/:path*', destination: '/api/:path*' }],
    }, null, 2));
    await writeFile(target, JSON.stringify({ crons: [], rewrites: [], headers: [{ source: '/x', headers: [] }] }, null, 2));

    const result = await runCli([
      'routing-sync',
      '--from-config',
      source,
      '--to-config',
      target,
      '--test-project-only',
      '--apply',
      '--yes',
    ], { VERCEL_TOKEN: '' });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Routing config synced/);
    const synced = JSON.parse(await readFile(target, 'utf8'));
    assert.deepEqual(synced.crons, [{ path: '/api/test-sync', schedule: '0 5 * * *' }]);
    assert.deepEqual(synced.rewrites, [{ source: '/test-api/:path*', destination: '/api/:path*' }]);
    assert.deepEqual(synced.headers, [{ source: '/x', headers: [] }]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

async function readFixture(file) {
  return JSON.parse(await readFile(join(FIXTURE_DIR, file), 'utf8'));
}
