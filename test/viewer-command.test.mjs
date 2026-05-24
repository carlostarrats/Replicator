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
    assert.match(html, /Replicator/);
    assert.match(html, /Load JSON report/);
    assert.match(html, /This viewer is local-only/);
    assert.match(html, /type="file"/);
    assert.doesNotMatch(html, /https:\/\/api\.vercel\.com/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('viewer sanitizes dynamic status and metric values before rendering', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-viewer-sanitize-'));
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
    const html = await readFile(out, 'utf8');
    assert.match(html, /safeStatusClass\(data\.status\)/);
    assert.match(html, /escapeHtml\(data\.readiness\.score\)/);
    assert.match(html, /escapeHtml\(data\.score\)/);
    assert.match(html, /escapeHtml\(data\.projectCount\)/);
    assert.doesNotMatch(html, /status-' \+ data\.status/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
