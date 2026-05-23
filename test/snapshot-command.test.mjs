import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('snapshot-diff compares two local analysis reports', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-snapshot-'));

  try {
    const left = join(dir, 'left.json');
    const right = join(dir, 'right.json');
    await writeFile(left, JSON.stringify({
      reportType: 'analysis',
      project: { name: 'a', framework: 'nextjs' },
      envs: [{ key: 'A', target: ['production'] }],
      domains: [],
    }));
    await writeFile(right, JSON.stringify({
      reportType: 'analysis',
      project: { name: 'b', framework: 'nextjs' },
      envs: [],
      domains: [],
    }));

    const result = await runCli(['snapshot-diff', '--left', left, '--right', right], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 2);
    assert.match(result.stdout, /Missing from b/);
    assert.match(result.stdout, /A/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('snapshot-save stores a timestamped local report copy', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-snapshot-save-'));

  try {
    const report = join(dir, 'analysis.json');
    const outDir = join(dir, 'snapshots');
    await writeFile(report, JSON.stringify({
      schemaVersion: 1,
      reportType: 'analysis',
      project: { name: 'brand-a-web' },
      envs: [],
      domains: [],
    }));

    const result = await runCli(['snapshot-save', '--report', report, '--out-dir', outDir], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Snapshot saved/);
    const files = await readdir(outDir);
    assert.equal(files.length, 1);
    assert.match(files[0], /^analysis-\d{4}-\d{2}-\d{2}T/);
    const saved = JSON.parse(await readFile(join(outDir, files[0]), 'utf8'));
    assert.equal(saved.reportType, 'analysis');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
