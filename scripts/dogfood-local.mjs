#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { startFakeVercelApi } from '../test/helpers/fake-vercel-api.mjs';

const outDir = resolve(parseOutDir(process.argv.slice(2)) || './.vcopy/dogfood');

await mkdir(outDir, { recursive: true });
const api = await startFakeVercelApi();

try {
  const analysis = join(outDir, 'analysis.json');
  const policy = join(outDir, 'policy.json');
  const policyOut = join(outDir, 'policy.txt');
  const snapshots = join(outDir, 'snapshots');
  const ci = join(outDir, 'ci.md');
  const template = join(outDir, 'template.json');
  const templatePlan = join(outDir, 'template-plan.md');
  const handoff = join(outDir, 'handoff');
  const viewer = join(outDir, 'viewer.html');

  await writeFile(policy, JSON.stringify({
    requiredEnvKeys: ['DATABASE_URL', 'OPENAI_API_KEY'],
    forbiddenPublicEnvKeys: ['NEXT_PUBLIC_SECRET_TOKEN'],
  }, null, 2));

  await runCli([
    'analyze',
    'brand-a-web',
    '--api-base',
    api.apiBase,
    '--format',
    'json',
    '--out',
    analysis,
  ], { allowExitCodes: [0] });

  await runCli([
    'policy-check',
    '--report',
    analysis,
    '--policy',
    policy,
    '--out',
    policyOut,
  ], { allowExitCodes: [0], token: '' });

  await runCli([
    'snapshot-save',
    '--report',
    analysis,
    '--out-dir',
    snapshots,
  ], { allowExitCodes: [0], token: '' });

  await runCli([
    'ci',
    '--from',
    'brand-a-web',
    '--to',
    'brand-b-web',
    '--api-base',
    api.apiBase,
    '--out',
    ci,
  ], { allowExitCodes: [0, 2] });

  await runCli([
    'template',
    'brand-a-web',
    '--api-base',
    api.apiBase,
    '--out',
    template,
  ], { allowExitCodes: [0] });

  await runCli([
    'template-plan',
    '--template',
    template,
    '--to',
    'vcopy-test-brand-c',
    '--out',
    templatePlan,
  ], { allowExitCodes: [0], token: '' });

  await runCli([
    'handoff-package',
    '--report',
    analysis,
    '--out-dir',
    handoff,
  ], { allowExitCodes: [0], token: '' });

  await runCli([
    'viewer',
    '--out',
    viewer,
  ], { allowExitCodes: [0], token: '' });

  process.stdout.write(`Dogfood workflow complete: ${outDir}\n`);
} finally {
  await api.close();
}

function parseOutDir(args) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--out-dir') {
      return args[index + 1];
    }
  }
  return undefined;
}

function runCli(args, { allowExitCodes, token = 'test-token' }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli.mjs', ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        VERCEL_AUTH_FILE: '',
        VERCEL_TOKEN: token,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
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
      if (allowExitCodes.includes(code)) {
        resolve({ code, stdout, stderr });
        return;
      }
      reject(new Error(`vcopy ${args[0]} exited ${code}\n${stderr || stdout}`));
    });
  });
}
