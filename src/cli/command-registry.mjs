export const COMMANDS = [
  { name: 'analyze', permission: 'read-only' },
  { name: 'check', permission: 'read-only' },
  { name: 'ci', permission: 'read-only' },
  { name: 'diff', permission: 'read-only' },
  { name: 'domain-move', permission: 'test-write' },
  { name: 'duplicate', permission: 'test-write' },
  { name: 'env-push', permission: 'test-write' },
  { name: 'env-rm', permission: 'test-write' },
  { name: 'env-template', permission: 'read-only' },
  { name: 'integration-plan', permission: 'read-only' },
  { name: 'overview', permission: 'read-only' },
  { name: 'policy-check', permission: 'local-only' },
  { name: 'projects', permission: 'read-only' },
  { name: 'protection-sync', permission: 'test-write' },
  { name: 'refactor-env', permission: 'read-only' },
  { name: 'report', permission: 'read-only' },
  { name: 'routing-sync', permission: 'test-write' },
  { name: 'secrets-migrate', permission: 'test-write' },
  { name: 'teams', permission: 'read-only' },
  { name: 'template', permission: 'read-only' },
  { name: 'template-plan', permission: 'local-only' },
  { name: 'verify', permission: 'read-only' },
  { name: 'viewer', permission: 'local-only' },
];

export function isKnownCommand(name) {
  return COMMANDS.some((command) => command.name === name);
}

export function getCommand(name) {
  return COMMANDS.find((command) => command.name === name);
}
