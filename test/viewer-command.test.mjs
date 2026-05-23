import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startLocalVercelApiTestServer } from './helpers/local-vercel-api-test-server.mjs';

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

