import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { COMMANDS } from '../src/cli/command-registry.mjs';

test('command reference documents every command', async () => {
  const docs = await readFile('docs/COMMANDS.md', 'utf8');

  for (const command of COMMANDS) {
    assert.match(docs, new RegExp(`## vcopy ${command.name.replace('-', '\\-')}`));
  }
});

test('security review covers secret and destructive safety', async () => {
  const docs = await readFile('docs/SECURITY_REVIEW.md', 'utf8');

  assert.match(docs, /Secret output review/);
  assert.match(docs, /Destructive command review/);
  assert.match(docs, /vcopy-test-/);
  assert.match(docs, /npm test/);
});

test('release checklist includes verification gates', async () => {
  const docs = await readFile('docs/RELEASE.md', 'utf8');

  assert.match(docs, /npm test/);
  assert.match(docs, /git diff --check/);
  assert.match(docs, /SECURITY_REVIEW/);
  assert.match(docs, /vcopy-test-/);
});

test('real project policy says real writes are disabled', async () => {
  const docs = await readFile('docs/REAL_PROJECT_POLICY.md', 'utf8');

  assert.match(docs, /disabled by default/i);
  assert.match(docs, /vcopy-test-/);
  assert.match(docs, /allowlist/);
  assert.match(docs, /dry-run artifact/);
});

test('local code review records follow-up hardening areas', async () => {
  const docs = await readFile('docs/CODE_REVIEW.md', 'utf8');

  assert.match(docs, /Local Code Review/);
  assert.match(docs, /Dogfood workflow/);
  assert.match(docs, /Policy rules/);
  assert.match(docs, /Schema validation/);
});

test('start here guide walks through the safe local workflow', async () => {
  const docs = await readFile('docs/START_HERE.md', 'utf8');

  assert.match(docs, /Start Here/);
  assert.match(docs, /npm run dogfood/);
  assert.match(docs, /local Vercel API test server/i);
  assert.match(docs, /vcopy-test-/);
  assert.match(docs, /handoff/);
});

test('readme is public-ready and avoids test-harness wording', async () => {
  const docs = await readFile('README.md', 'utf8');

  assert.match(docs, /^# Replicator/m);
  assert.match(docs, /Vercel config manager/i);
  assert.match(docs, /## Overview/);
  assert.match(docs, /## What it does/);
  assert.match(docs, /## Safety model/);
  assert.match(docs, /## License/);
  assert.match(docs, /designed for real Vercel projects/i);
  assert.match(docs, /current release/i);
  assert.match(docs, /does not freely mutate real Vercel projects/i);
  assert.match(docs, /local Vercel API test server/i);
  assert.doesNotMatch(docs, /\bfake\b/i);
  assert.doesNotMatch(docs, /simulat/i);
});

test('repository has an open source license', async () => {
  const license = await readFile('LICENSE', 'utf8');

  assert.match(license, /MIT License/);
  assert.match(license, /Carlos Tarrats/);
});
