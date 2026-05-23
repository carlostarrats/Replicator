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
