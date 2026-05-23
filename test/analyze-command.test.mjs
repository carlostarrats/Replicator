import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startFakeVercelApi } from './helpers/fake-vercel-api.mjs';

test('analyze writes a safe Markdown report with env names and scopes only', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-'));
  const out = join(dir, 'vcopy-report.md');

  try {
    const result = await runCli([
      'analyze',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Project analyzed successfully/);
    assert.match(result.stdout, new RegExp(`Report saved to ${out.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    const report = await readFile(out, 'utf8');
    assert.match(report, /# Vercel Project Analysis Report/);
    assert.match(report, /Project: brand-a-web/);
    assert.match(report, /Framework: nextjs/);
    assert.match(report, /Root directory: apps\/web/);
    assert.match(report, /Project Settings/);
    assert.match(report, /Node version: 20\.x/);
    assert.match(report, /Serverless function region: iad1/);
    assert.match(report, /Git fork protection: enabled/);
    assert.match(report, /Auto-expose system envs: disabled/);
    assert.match(report, /Web analytics: enabled/);
    assert.match(report, /DATABASE_URL.*production, preview/);
    assert.match(report, /NEXT_PUBLIC_APP_URL.*production, preview, development/);
    assert.match(report, /Domains/);
    assert.match(report, /brand-a\.example\.com - verified/);
    assert.match(report, /www\.brand-a\.example\.com - not verified/);
    assert.doesNotMatch(report, /test-token/);
    assert.doesNotMatch(report, /value/i);
    assert.ok(api.requests.every((request) => request.auth === 'Bearer test-token'));
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('analyze exits clearly when no token is configured', async () => {
  const result = await runCli(['analyze', 'brand-a-web'], {
    VERCEL_TOKEN: '',
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Missing Vercel token/);
});

test('analyze can use a local Vercel CLI auth token when VERCEL_TOKEN is absent', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-auth-'));
  const authFile = join(dir, 'auth.json');
  const out = join(dir, 'report.md');

  try {
    await writeFile(authFile, JSON.stringify({ token: 'cli-auth-token' }));
    const result = await runCli([
      'analyze',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: '',
      VERCEL_AUTH_FILE: authFile,
    });

    assert.equal(result.code, 0, result.stderr);
    assert.ok(api.requests.every((request) => request.auth === 'Bearer cli-auth-token'));
    const report = await readFile(out, 'utf8');
    assert.doesNotMatch(report, /cli-auth-token/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('analyze can read team scope from local .vercel project metadata', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-vercel-meta-'));
  const out = join(dir, 'report.md');

  try {
    await mkdir(join(dir, '.vercel'), { recursive: true });
    await writeFile(join(dir, '.vercel', 'project.json'), JSON.stringify({
      orgId: 'team_from_file',
      projectId: 'prj_from_file',
    }));

    const result = await runCli([
      'analyze',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--code-root',
      dir,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.ok(api.requests.some((request) => request.url === '/v9/projects/brand-a-web?teamId=team_from_file'));
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('analyze exits clearly when project selection is invalid', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli(['analyze', '--api-base', api.apiBase], {
      VERCEL_TOKEN: 'test-token',
    }, '9\n');

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Invalid project selection: 9/);
  } finally {
    await api.close();
  }
});

test('analyze lists projects and uses the selected source when no project is passed', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-'));
  const out = join(dir, 'vcopy-report.md');

  try {
    const result = await runCli([
      'analyze',
      '--api-base',
      api.apiBase,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    }, '1\n');

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Select a source project/);
    assert.match(result.stdout, /1\. brand-a-web/);
    assert.match(result.stdout, /Project analyzed successfully/);

    const report = await readFile(out, 'utf8');
    assert.match(report, /Project: brand-a-web/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});


test('analyze scans source code for env vars missing from Vercel', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-code-'));
  const appDir = join(dir, 'apps', 'web');
  const out = join(dir, 'report.md');

  try {
    await mkdir(appDir, { recursive: true });
    await writeFile(join(appDir, 'config.js'), [
      'const required = process.env.STRIPE_SECRET_KEY;',
      'const publicUrl = process.env.NEXT_PUBLIC_APP_URL;',
      '',
    ].join('\n'));

    const result = await runCli([
      'analyze',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--code-root',
      dir,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    const report = await readFile(out, 'utf8');
    assert.match(report, /Referenced in Code but Missing in Vercel/);
    assert.match(report, /STRIPE_SECRET_KEY - apps\/web\/config\.js/);
    assert.doesNotMatch(report, /NEXT_PUBLIC_APP_URL - apps\/web\/config\.js/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('analyze reports cron jobs and rewrites from vercel config', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-config-'));
  const out = join(dir, 'report.md');

  try {
    await writeFile(join(dir, 'vercel.json'), JSON.stringify({
      crons: [
        { path: '/api/sync', schedule: '0 5 * * *' },
      ],
      rewrites: [
        { source: '/old', destination: '/new' },
      ],
    }, null, 2));

    const result = await runCli([
      'analyze',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--code-root',
      dir,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    const report = await readFile(out, 'utf8');
    assert.match(report, /Vercel Config File/);
    assert.match(report, /Cron: \/api\/sync - 0 5 \* \* \*/);
    assert.match(report, /Rewrite: \/old -> \/new/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('analyze retries once when the Vercel API rate limits a request', async () => {
  const api = await startFakeVercelApi({ rateLimitProjectOnce: true });
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-rate-'));
  const out = join(dir, 'report.md');

  try {
    const result = await runCli([
      'analyze',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Project analyzed successfully/);
    const projectRequests = api.requests.filter((request) => request.url === '/v9/projects/brand-a-web');
    assert.equal(projectRequests.length, 2);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('analyze can export JSON for automation', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-json-'));
  const out = join(dir, 'analysis.json');

  try {
    const result = await runCli([
      'analyze',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--format',
      'json',
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(report.project.name, 'brand-a-web');
    assert.equal(report.envs.length, 4);
    assert.equal(report.domains.length, 2);
    assert.equal(report.envs[0].value, undefined);
    assert.equal(report.envs[0].createdBy, undefined);
    assert.equal(report.envs[0].lastEditedByDisplayName, undefined);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('analyze reports likely services from environment variable names', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-services-'));
  const out = join(dir, 'report.md');

  try {
    const result = await runCli([
      'analyze',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    const report = await readFile(out, 'utf8');
    assert.match(report, /Likely Services/);
    assert.match(report, /OpenAI/);
    assert.match(report, /Vercel Blob/);
    assert.match(report, /Postgres\/database/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});
