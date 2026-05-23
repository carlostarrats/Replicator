import { strict as assert } from 'node:assert';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('audit-save stores a timestamped report copy', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-audit-'));

  try {
    const report = join(dir, 'ci.json');
    const outDir = join(dir, 'history');
    await writeFile(report, JSON.stringify({
      schemaVersion: 1,
      reportType: 'ci',
      status: 'passed',
    }));

    const result = await runCli(['audit-save', '--report', report, '--out-dir', outDir], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Audit report saved/);
    const files = await readdir(outDir);
    assert.equal(files.length, 1);
    const saved = JSON.parse(await readFile(join(outDir, files[0]), 'utf8'));
    assert.equal(saved.reportType, 'ci');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
