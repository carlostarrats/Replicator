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
