import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanCodeEnvReferences } from '../src/analysis/scan-code-env.mjs';

test('source scanner finds dot bracket template and destructured env refs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-source-scan-'));

  try {
    await writeFile(join(dir, 'app.ts'), [
      'const direct = process.env.DATABASE_URL;',
      'const { OPENAI_API_KEY, STRIPE_SECRET_KEY: stripeKey } = process.env;',
      'const bracket = process.env["BLOB_READ_WRITE_TOKEN"];',
      'const template = process.env[`SENTRY_DSN`];',
      '',
    ].join('\n'));

    const refs = await scanCodeEnvReferences(dir);
    const keys = refs.map((ref) => ref.key);

    assert.deepEqual(keys, [
      'BLOB_READ_WRITE_TOKEN',
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'SENTRY_DSN',
      'STRIPE_SECRET_KEY',
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
