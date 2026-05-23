import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('policy-check fails when required env keys are missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-policy-'));

  try {
    const report = join(dir, 'analysis.json');
    const policy = join(dir, 'policy.json');
    await writeFile(report, JSON.stringify({
      reportType: 'analysis',
      envs: [{ key: 'DATABASE_URL', target: ['production'] }],
    }));
    await writeFile(policy, JSON.stringify({
      requiredEnvKeys: ['DATABASE_URL', 'OPENAI_API_KEY'],
    }));

    const result = await runCli([
      'policy-check',
      '--report',
      report,
      '--policy',
      policy,
    ], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 4);
    assert.match(result.stdout, /OPENAI_API_KEY missing/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('policy-check fails when forbidden public env keys are present', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-policy-public-'));

  try {
    const report = join(dir, 'analysis.json');
    const policy = join(dir, 'policy.json');
    await writeFile(report, JSON.stringify({
      reportType: 'analysis',
      envs: [
        { key: 'NEXT_PUBLIC_SECRET_TOKEN', target: ['preview'] },
        { key: 'DATABASE_URL', target: ['production'] },
      ],
    }));
    await writeFile(policy, JSON.stringify({
      forbiddenPublicEnvKeys: ['NEXT_PUBLIC_SECRET_TOKEN'],
    }));

    const result = await runCli([
      'policy-check',
      '--report',
      report,
      '--policy',
      policy,
    ], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 4);
    assert.match(result.stdout, /NEXT_PUBLIC_SECRET_TOKEN is forbidden/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('policy-check passes when local report satisfies policy', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-policy-pass-'));

  try {
    const report = join(dir, 'analysis.json');
    const policy = join(dir, 'policy.json');
    await writeFile(report, JSON.stringify({
      reportType: 'analysis',
      envs: [
        { key: 'DATABASE_URL', target: ['production'] },
        { key: 'OPENAI_API_KEY', target: ['preview'] },
      ],
    }));
    await writeFile(policy, JSON.stringify({
      requiredEnvKeys: ['DATABASE_URL', 'OPENAI_API_KEY'],
      forbiddenPublicEnvKeys: ['NEXT_PUBLIC_SECRET_TOKEN'],
    }));

    const result = await runCli([
      'policy-check',
      '--report',
      report,
      '--policy',
      policy,
    ], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Policy passed/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('policy-check evaluates domains and project settings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-policy-settings-'));

  try {
    const report = join(dir, 'analysis.json');
    const policy = join(dir, 'policy.json');
    await writeFile(report, JSON.stringify({
      reportType: 'analysis',
      project: {
        name: 'brand-a-web',
        framework: 'nextjs',
        rootDirectory: 'apps/web',
        autoExposeSystemEnvs: true,
      },
      envs: [],
      domains: [{ name: 'brand-a.example.com' }],
    }));
    await writeFile(policy, JSON.stringify({
      requiredDomains: ['brand-a.example.com', 'www.brand-a.example.com'],
      requiredProjectSettings: {
        framework: 'nextjs',
        rootDirectory: 'apps/admin',
      },
      forbiddenProjectSettings: {
        autoExposeSystemEnvs: true,
      },
    }));

    const result = await runCli([
      'policy-check',
      '--report',
      report,
      '--policy',
      policy,
    ], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 4);
    assert.match(result.stdout, /www\.brand-a\.example\.com domain missing/);
    assert.match(result.stdout, /rootDirectory expected apps\/admin but found apps\/web/);
    assert.match(result.stdout, /autoExposeSystemEnvs must not be true/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('policy-check evaluates forbidden env targets', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-policy-targets-'));

  try {
    const report = join(dir, 'analysis.json');
    const policy = join(dir, 'policy.json');
    await writeFile(report, JSON.stringify({
      reportType: 'analysis',
      envs: [
        { key: 'DATABASE_URL', target: ['production', 'development'] },
      ],
    }));
    await writeFile(policy, JSON.stringify({
      forbiddenEnvTargets: [
        { key: 'DATABASE_URL', targets: ['development'] },
      ],
    }));

    const result = await runCli([
      'policy-check',
      '--report',
      report,
      '--policy',
      policy,
    ], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 4);
    assert.match(result.stdout, /DATABASE_URL must not target development/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
