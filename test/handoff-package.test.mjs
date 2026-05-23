import { strict as assert } from 'node:assert';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('handoff-package creates local package folder', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-handoff-'));

  try {
    const report = join(dir, 'analysis.json');
    await writeFile(report, JSON.stringify({
      reportType: 'analysis',
      project: { name: 'brand-a-web' },
      envs: [],
    }));
    const outDir = join(dir, 'handoff');

    const result = await runCli(['handoff-package', '--report', report, '--out-dir', outDir], {
      VERCEL_TOKEN: '',
    });

    assert.equal(result.code, 0, result.stderr);
    const files = await readdir(outDir);
    assert.ok(files.includes('analysis.json'));
    assert.ok(files.includes('README.md'));
    assert.ok(files.includes('vcopy-viewer.html'));
    assert.match(await readFile(join(outDir, 'README.md'), 'utf8'), /brand-a-web/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
