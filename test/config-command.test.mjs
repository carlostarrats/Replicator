import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startFakeVercelApi } from './helpers/fake-vercel-api.mjs';

test('loads defaults from .vcopyrc.json', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-config-'));

  try {
    const config = join(dir, '.vcopyrc.json');
    const out = join(dir, 'viewer.html');
    await writeFile(config, JSON.stringify({
      teamId: 'team_from_config',
      testProjectPrefix: 'vcopy-test-',
      defaultOutDir: './vcopy-reports',
    }, null, 2));

    const result = await runCli(['viewer', '--config', config, '--out', out], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(await readFile(out, 'utf8'), /Vercel Config Manager/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('uses config team scope for fake API requests', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-config-team-'));

  try {
    const config = join(dir, '.vcopyrc.json');
    await writeFile(config, JSON.stringify({
      teamId: 'team_from_config',
    }, null, 2));

    const result = await runCli([
      'projects',
      '--config',
      config,
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
      VERCEL_TEAM_ID: '',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.ok(api.requests.some((request) => request.url === '/v9/projects?teamId=team_from_config'));
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('config file validation reports invalid fields clearly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-config-invalid-'));

  try {
    const config = join(dir, '.vcopyrc.json');
    await writeFile(config, JSON.stringify({
      teamId: 123,
    }));

    const result = await runCli(['viewer', '--config', config, '--out', join(dir, 'viewer.html')], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Invalid .vcopyrc.json/);
    assert.match(result.stderr, /teamId must be a string/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
