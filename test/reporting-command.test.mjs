import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startFakeVercelApi } from './helpers/fake-vercel-api.mjs';

test('teams lists available Vercel teams', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'teams',
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Vercel teams/);
    assert.match(result.stdout, /Acme/);
    assert.match(result.stdout, /team_123/);
  } finally {
    await api.close();
  }
});

test('projects lists available Vercel projects', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'projects',
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Vercel projects/);
    assert.match(result.stdout, /brand-a-web/);
    assert.match(result.stdout, /prj_123/);
  } finally {
    await api.close();
  }
});

test('diff compares build settings and environment variable scopes', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'diff',
      'brand-a-web',
      'brand-b-web',
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Comparing brand-a-web and brand-b-web/);
    assert.match(result.stdout, /Same:/);
    assert.match(result.stdout, /Framework: nextjs/);
    assert.match(result.stdout, /Different:/);
    assert.match(result.stdout, /DATABASE_URL/);
    assert.match(result.stdout, /Missing from brand-a-web:/);
    assert.match(result.stdout, /NEXT_PUBLIC_BRAND/);
    assert.match(result.stdout, /Domain brand-a\.example\.com/);
    assert.match(result.stdout, /Domain brand-b\.example\.com/);
  } finally {
    await api.close();
  }
});

test('diff can export JSON drift data', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-diff-json-'));
  const out = join(dir, 'diff.json');

  try {
    const result = await runCli([
      'diff',
      'brand-a-web',
      'brand-b-web',
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
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.reportType, 'diff');
    assert.equal(report.leftName, 'brand-a-web');
    assert.equal(report.rightName, 'brand-b-web');
    assert.ok(report.diff.different.some((item) => item.includes('DATABASE_URL')));
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('diff can fail the process when drift is detected', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'diff',
      'brand-a-web',
      'brand-b-web',
      '--api-base',
      api.apiBase,
      '--fail-on-drift',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 2);
    assert.match(result.stdout, /Different:/);
    assert.match(result.stdout, /DATABASE_URL/);
  } finally {
    await api.close();
  }
});

test('report combines analysis readiness duplicate plan and diff', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-report-'));
  const out = join(dir, 'migration.md');

  try {
    const result = await runCli([
      'report',
      '--from',
      'brand-a-web',
      '--to',
      'brand-b-web',
      '--api-base',
      api.apiBase,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`Report saved to ${out.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    const report = await readFile(out, 'utf8');
    assert.match(report, /# Vercel Migration Report/);
    assert.match(report, /Source: brand-a-web/);
    assert.match(report, /Target: brand-b-web/);
    assert.match(report, /## Duplicate Plan/);
    assert.match(report, /## Target Readiness/);
    assert.match(report, /## Project Diff/);
    assert.match(report, /DATABASE_URL/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('ci reports readiness and drift with a failing automation exit code', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'ci',
      '--from',
      'brand-a-web',
      '--to',
      'brand-b-web',
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 2);
    assert.match(result.stdout, /Vercel config CI/);
    assert.match(result.stdout, /Status: failed/);
    assert.match(result.stdout, /DATABASE_URL missing for Preview/);
    assert.match(result.stdout, /DATABASE_URL: preview, production -> production/);
  } finally {
    await api.close();
  }
});

test('ci can export schema-versioned JSON', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-ci-json-'));
  const out = join(dir, 'ci.json');

  try {
    const result = await runCli([
      'ci',
      '--from',
      'brand-a-web',
      '--to',
      'brand-b-web',
      '--api-base',
      api.apiBase,
      '--format',
      'json',
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 2);
    const report = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.reportType, 'ci');
    assert.equal(report.status, 'failed');
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('check reports practical readiness and blocked environment gaps', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'check',
      'brand-b-web',
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Deployment readiness: 80%/);
    assert.match(result.stdout, /Ready:/);
    assert.match(result.stdout, /Build settings configured/);
    assert.match(result.stdout, /Blocked:/);
    assert.match(result.stdout, /DATABASE_URL missing for Preview/);
  } finally {
    await api.close();
  }
});

test('check can fail the process when readiness has blockers', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'check',
      'brand-b-web',
      '--api-base',
      api.apiBase,
      '--fail-on-blocked',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 2);
    assert.match(result.stdout, /DATABASE_URL missing for Preview/);
  } finally {
    await api.close();
  }
});


test('refactor-env recommends shared and project-specific variables across projects', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'refactor-env',
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Shared env recommendations/);
    assert.match(result.stdout, /Good candidates for shared env vars:/);
    assert.match(result.stdout, /OPENAI_API_KEY - used by 2 projects/);
    assert.match(result.stdout, /Should remain project-specific:/);
    assert.match(result.stdout, /NEXT_PUBLIC_BRAND/);
    assert.match(result.stdout, /Scope drift:/);
    assert.match(result.stdout, /DATABASE_URL differs across projects/);
  } finally {
    await api.close();
  }
});

test('refactor-env can analyze an explicit project list', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'refactor-env',
      '--projects',
      'brand-a-web,brand-b-web',
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /OPENAI_API_KEY - used by 2 projects/);
    assert.equal(api.requests.filter((request) => request.url === '/v9/projects').length, 0);
  } finally {
    await api.close();
  }
});

test('overview groups related projects and surfaces variant drift', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'overview',
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Team config overview/);
    assert.match(result.stdout, /acme\/app-monorepo :: apps\/web/);
    assert.match(result.stdout, /brand-a-web, brand-b-web/);
    assert.match(result.stdout, /Drift signals:/);
    assert.match(result.stdout, /DATABASE_URL differs across projects/);
    assert.match(result.stdout, /BLOB_READ_WRITE_TOKEN missing from brand-b-web/);
  } finally {
    await api.close();
  }
});

test('overview can fail automation when grouped variants drift', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'overview',
      '--api-base',
      api.apiBase,
      '--fail-on-drift',
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 2);
    assert.match(result.stdout, /BLOB_READ_WRITE_TOKEN missing from brand-b-web/);
  } finally {
    await api.close();
  }
});

test('overview can export schema-versioned JSON', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-overview-json-'));
  const out = join(dir, 'overview.json');

  try {
    const result = await runCli([
      'overview',
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
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.reportType, 'overview');
    assert.equal(report.projectCount, 2);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('verify classifies failed deployment logs into config fixes', async () => {
  const api = await startFakeVercelApi();

  try {
    const result = await runCli([
      'verify',
      'brand-b-web',
      '--api-base',
      api.apiBase,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Preview deployment failed/);
    assert.match(result.stdout, /Detected issue:/);
    assert.match(result.stdout, /DATABASE_URL is missing or invalid in Preview/);
    assert.match(result.stdout, /vercel env add DATABASE_URL preview/);
  } finally {
    await api.close();
  }
});

test('verify can export JSON deployment classification', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-verify-json-'));
  const out = join(dir, 'verify.json');

  try {
    const result = await runCli([
      'verify',
      'brand-b-web',
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
    assert.equal(report.deployment.state, 'ERROR');
    assert.match(report.classification.summary, /DATABASE_URL/);
    assert.equal(report.deployment.creator, undefined);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('verify falls back when a deployments API version is unavailable', async () => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(request.url);
    response.setHeader('content-type', 'application/json');
    const url = new URL(request.url, 'http://localhost');

    if (url.pathname === '/v13/deployments') {
      response.statusCode = 400;
      response.end(JSON.stringify({ error: { message: 'Invalid API version' } }));
      return;
    }

    if (url.pathname === '/v6/deployments') {
      response.end(JSON.stringify({
        deployments: [
          { uid: 'dpl_ready', url: 'ready.vercel.app', state: 'READY', target: 'production' },
        ],
      }));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ error: { message: 'not found' } }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  try {
    const result = await runCli([
      'verify',
      'brand-b-web',
      '--api-base',
      `http://127.0.0.1:${address.port}`,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Latest deployment is ready/);
    assert.ok(requests.some((entry) => entry.startsWith('/v13/deployments')));
    assert.ok(requests.some((entry) => entry.startsWith('/v6/deployments')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('check can export its readiness report to Markdown', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-check-'));
  const out = join(dir, 'check.md');

  try {
    const result = await runCli([
      'check',
      'brand-b-web',
      '--api-base',
      api.apiBase,
      '--out',
      out,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`Report saved to ${out.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    const report = await readFile(out, 'utf8');
    assert.match(report, /Deployment readiness: 80%/);
    assert.match(report, /DATABASE_URL missing for Preview/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('check can export JSON readiness data', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-check-json-'));
  const out = join(dir, 'check.json');

  try {
    const result = await runCli([
      'check',
      'brand-b-web',
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
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.reportType, 'check');
    assert.equal(report.score, 80);
    assert.deepEqual(report.blocked, ['DATABASE_URL missing for Preview']);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('check uses code scanning to flag env vars missing from Vercel', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-check-code-'));
  const appDir = join(dir, 'app');

  try {
    await mkdir(appDir, { recursive: true });
    await writeFile(join(appDir, 'server.js'), 'process.env.STRIPE_SECRET_KEY;\n');

    const result = await runCli([
      'check',
      'brand-a-web',
      '--api-base',
      api.apiBase,
      '--code-root',
      dir,
    ], {
      VERCEL_TOKEN: 'test-token',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /STRIPE_SECRET_KEY referenced in code but missing in Vercel/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});
