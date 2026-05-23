import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('dogfood script runs the full local simulator workflow', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-dogfood-'));

  try {
    const result = await runNode(['scripts/dogfood-local.mjs', '--out-dir', dir]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Dogfood workflow complete/);
    assert.match(await readFile(join(dir, 'analysis.json'), 'utf8'), /brand-a-web/);
    assert.match(await readFile(join(dir, 'ci.md'), 'utf8'), /Vercel config CI/);
    assert.match(await readFile(join(dir, 'policy.txt'), 'utf8'), /Policy passed/);
    assert.match(await readFile(join(dir, 'template-plan.md'), 'utf8'), /Template plan/);
    assert.match(await readFile(join(dir, 'handoff', 'README.md'), 'utf8'), /brand-a-web/);
    assert.match(await readFile(join(dir, 'viewer.html'), 'utf8'), /Vercel Config Manager/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

function runNode(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, VERCEL_AUTH_FILE: '' },
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
      resolve({ code, stdout, stderr });
    });
  });
}
