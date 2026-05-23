import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('domain-move includes manual recovery guidance on API failure', async () => {
  const api = await startFailingWriteApi();

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

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Forbidden/);
    assert.match(result.stderr, /manual recovery|No changes were made/i);
  } finally {
    await api.close();
  }
});

test('protection-sync includes manual recovery guidance on API failure', async () => {
  const api = await startFailingWriteApi();

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

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Forbidden/);
    assert.match(result.stderr, /manual recovery|No changes were made/i);
  } finally {
    await api.close();
  }
});

test('secrets-migrate includes manual recovery guidance on API failure', async () => {
  const api = await startFailingWriteApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-api-error-'));
  const envFile = join(dir, '.env');

  try {
    await writeFile(envFile, 'DATABASE_URL=postgres://secret\n');
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

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Forbidden/);
    assert.match(result.stderr, /manual recovery|No changes were made/i);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

async function startFailingWriteApi() {
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      const url = new URL(request.url, 'http://localhost');
      response.setHeader('content-type', 'application/json');

      if (request.method === 'GET' && url.pathname === '/v9/projects/vcopy-test-source') {
        response.end(JSON.stringify({
          gitForkProtection: true,
          ssoProtection: 'standard',
          autoExposeSystemEnvs: false,
        }));
        return;
      }

      if (request.method === 'PATCH'
        || request.method === 'POST'
        || request.method === 'DELETE') {
        response.statusCode = 403;
        response.end(JSON.stringify({ error: { message: 'Forbidden' } }));
        return;
      }

      response.statusCode = 404;
      response.end(JSON.stringify({ error: { message: 'not found' } }));
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    apiBase: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
