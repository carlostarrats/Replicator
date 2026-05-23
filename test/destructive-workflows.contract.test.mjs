import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const FIXTURE_DIR = 'test/fixtures/destructive-workflows';
const FIXTURES = [
  'bulk-secret-migration.json',
  'domain-move.json',
  'integration-credentials.json',
  'deployment-protection.json',
  'cron-rewrite-mutation.json',
];

test('destructive workflow fixtures are scoped to test projects or test files', async () => {
  for (const file of FIXTURES) {
    const fixture = await readFixture(file);
    assert.equal(fixture.destructive, true, `${file} must be marked destructive`);
    assert.ok(Array.isArray(fixture.dryRunCommand), `${file} needs a dry-run command`);
    assert.ok(Array.isArray(fixture.applyCommand), `${file} needs an apply command`);
    assert.ok(fixture.expectedSafety.length > 0, `${file} needs safety expectations`);

    if (fixture.sourceProject) {
      assert.match(fixture.sourceProject, /^vcopy-test-/, `${file} source project must be test-scoped`);
    }
    if (fixture.targetProject) {
      assert.match(fixture.targetProject, /^vcopy-test-/, `${file} target project must be test-scoped`);
    }

    const joinedApply = fixture.applyCommand.join(' ');
    assert.match(joinedApply, /--test-project-only/, `${file} apply must require --test-project-only`);
    assert.match(joinedApply, /--apply/, `${file} apply must require --apply`);
    assert.match(joinedApply, /--yes/, `${file} apply must require --yes`);
  }
});

test('destructive workflow dry runs do not include apply flags', async () => {
  for (const file of FIXTURES) {
    const fixture = await readFixture(file);
    const joinedDryRun = fixture.dryRunCommand.join(' ');
    assert.match(joinedDryRun, /--dry-run/, `${file} dry run must include --dry-run`);
    assert.doesNotMatch(joinedDryRun, /--apply/, `${file} dry run must not include --apply`);
    assert.doesNotMatch(joinedDryRun, /--yes/, `${file} dry run must not include --yes`);
  }
});

test('bulk secret migration writes only selected keys to vcopy-test targets', { todo: 'Implement secrets-migrate with fake Vercel API only.' });
test('domain move refuses real projects and moves only vcopy-test domains', { todo: 'Implement domain-move against fake Vercel API/test projects only.' });
test('integration credential migration emits manual checklist without copying credentials', { todo: 'Implement integration-plan as dry-run/manual checklist first.' });
test('deployment protection sync excludes bypass secrets and requires test-project-only apply', { todo: 'Implement protection-sync against fake Vercel API/test projects only.' });
test('cron and rewrite sync mutates only test fixture config files', { todo: 'Implement routing-sync on test fixture files before any real project path is allowed.' });

async function readFixture(file) {
  return JSON.parse(await readFile(join(FIXTURE_DIR, file), 'utf8'));
}
