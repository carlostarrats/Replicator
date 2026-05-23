import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';

function runCli(args, env = {}, input = '') {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['src/cli.mjs', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, VERCEL_AUTH_FILE: '', ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    if (input) {
      child.stdin.end(input);
    } else {
      child.stdin.end();
    }
  });
}

async function startFakeVercelApi(options = {}) {
  const requests = [];
  const rateLimitedPaths = new Set();
  const server = createServer((request, response) => {
    let requestBody = '';
    request.on('data', (chunk) => {
      requestBody += chunk;
    });
    request.on('end', () => handleRequest(request, response, requestBody));
  });

  function handleRequest(request, response, requestBody) {
    requests.push({
      method: request.method,
      url: request.url,
      auth: request.headers.authorization,
      body: requestBody ? JSON.parse(requestBody) : undefined,
    });

    const url = new URL(request.url, 'http://localhost');
    response.setHeader('content-type', 'application/json');

    if (options.rateLimitProjectOnce && url.pathname === '/v9/projects/brand-a-web' && !rateLimitedPaths.has(url.pathname)) {
      rateLimitedPaths.add(url.pathname);
      response.statusCode = 429;
      response.setHeader('retry-after', '0');
      response.end(JSON.stringify({ error: { message: 'Rate limited' } }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-a-web') {
      response.end(JSON.stringify({
        id: 'prj_123',
        name: 'brand-a-web',
        framework: 'nextjs',
        buildCommand: 'pnpm build',
        installCommand: 'pnpm install',
        devCommand: 'pnpm dev',
        outputDirectory: '.next',
        rootDirectory: 'apps/web',
        nodeVersion: '20.x',
        serverlessFunctionRegion: 'iad1',
        ssoProtection: null,
        gitForkProtection: true,
        autoExposeSystemEnvs: false,
        webAnalytics: { id: 'wa_123' },
        gitRepository: {
          repo: 'acme/app-monorepo',
          type: 'github',
        },
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-b-web') {
      response.end(JSON.stringify({
        id: 'prj_456',
        name: 'brand-b-web',
        framework: 'nextjs',
        buildCommand: 'pnpm build',
        installCommand: 'pnpm install',
        outputDirectory: '.next',
        rootDirectory: 'apps/web',
        gitRepository: {
          repo: 'acme/app-monorepo',
          type: 'github',
        },
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects') {
      response.end(JSON.stringify({
        projects: [
          { id: 'prj_123', name: 'brand-a-web', framework: 'nextjs' },
          { id: 'prj_456', name: 'brand-b-web', framework: 'nextjs' },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v2/teams') {
      response.end(JSON.stringify({
        teams: [
          { id: 'team_123', slug: 'acme', name: 'Acme' },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-a-web/env') {
      response.end(JSON.stringify({
        envs: [
          {
            id: 'vq_delete',
            key: 'DATABASE_URL',
            target: ['production', 'preview'],
            type: 'encrypted',
            value: 'encrypted-payload',
            createdBy: 'user_123',
            lastEditedByDisplayName: 'Person',
          },
          {
            key: 'NEXT_PUBLIC_APP_URL',
            target: ['production', 'preview', 'development'],
            type: 'plain',
          },
          {
            key: 'OPENAI_API_KEY',
            target: ['production', 'preview'],
            type: 'encrypted',
          },
          {
            id: 'vq_blob_delete',
            key: 'BLOB_READ_WRITE_TOKEN',
            target: ['production'],
            type: 'encrypted',
          },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-a-web/domains') {
      response.end(JSON.stringify({
        domains: [
          { name: 'brand-a.example.com', verified: true },
          { name: 'www.brand-a.example.com', verified: false },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-b-web/env') {
      response.end(JSON.stringify({
        envs: [
          {
            key: 'DATABASE_URL',
            target: ['production'],
            type: 'encrypted',
          },
          {
            key: 'NEXT_PUBLIC_APP_URL',
            target: ['production', 'preview', 'development'],
            type: 'plain',
          },
          {
            key: 'NEXT_PUBLIC_BRAND',
            target: ['production', 'preview'],
            type: 'plain',
          },
          {
            key: 'OPENAI_API_KEY',
            target: ['production', 'preview'],
            type: 'encrypted',
          },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-b-web/domains') {
      response.end(JSON.stringify({
        domains: [
          { name: 'brand-b.example.com', verified: true },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v13/deployments') {
      response.end(JSON.stringify({
        deployments: [
          {
            uid: 'dpl_failed',
            url: 'brand-b-web-failed.vercel.app',
            name: 'brand-b-web',
            state: 'ERROR',
            target: 'preview',
            creator: { email: 'person@example.com' },
          },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v6/deployments') {
      response.end(JSON.stringify({
        deployments: [
          {
            uid: 'dpl_failed',
            url: 'brand-b-web-failed.vercel.app',
            name: 'brand-b-web',
            state: 'ERROR',
            target: 'preview',
          },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v3/deployments/dpl_failed/events') {
      response.end(JSON.stringify([
        {
          type: 'stderr',
          payload: {
            text: 'PrismaClientInitializationError: error: Environment variable not found: DATABASE_URL',
          },
        },
      ]));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/v10/projects') {
      response.statusCode = 201;
      response.end(JSON.stringify({
        id: 'prj_789',
        name: requestBody ? JSON.parse(requestBody).name : 'brand-c-web',
        accountId: 'team_secret_scope',
        features: { webAnalytics: true },
      }));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/v9/projects/brand-a-web/env') {
      response.statusCode = 201;
      response.end(JSON.stringify({
        created: true,
        key: requestBody ? JSON.parse(requestBody).key : undefined,
      }));
      return;
    }

    if (request.method === 'DELETE' && url.pathname === '/v9/projects/brand-a-web/env/vq_delete') {
      response.end(JSON.stringify({ removed: true }));
      return;
    }

    if (request.method === 'DELETE' && url.pathname === '/v9/projects/brand-a-web/env/vq_blob_delete') {
      response.end(JSON.stringify({ removed: true }));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ error: { message: 'not found' } }));
  }

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    apiBase: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

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

test('duplicate dry-run prints a safe copy plan without mutating projects', async () => {
  const api = await startFakeVercelApi();
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
  const api = await startFakeVercelApi();
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
  const api = await startFakeVercelApi();

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
  const api = await startFakeVercelApi();
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

test('viewer writes a local static report viewer without Vercel auth', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-viewer-'));
  const out = join(dir, 'viewer.html');

  try {
    const result = await runCli([
      'viewer',
      '--out',
      out,
    ], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Viewer saved/);
    const html = await readFile(out, 'utf8');
    assert.match(html, /Vercel Config Manager/);
    assert.match(html, /Load JSON report/);
    assert.match(html, /This viewer is local-only/);
    assert.match(html, /type="file"/);
    assert.doesNotMatch(html, /https:\/\/api\.vercel\.com/);
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
