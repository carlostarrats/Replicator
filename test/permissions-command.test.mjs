import { strict as assert } from 'node:assert';
import test from 'node:test';
import { COMMANDS } from '../src/cli/command-registry.mjs';

const categories = new Set(['read-only', 'local-only', 'test-write']);

test('every command declares a permission category', () => {
  for (const command of COMMANDS) {
    assert.ok(categories.has(command.permission), `${command.name} has invalid permission ${command.permission}`);
  }
});

test('destructive commands are test-write only', () => {
  const destructive = ['secrets-migrate', 'domain-move', 'protection-sync', 'routing-sync'];
  for (const name of destructive) {
    const command = COMMANDS.find((entry) => entry.name === name);
    assert.equal(command.permission, 'test-write');
  }
});
