# Vercel Config Manager Full Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the post-MVP hardening work for Vercel Config Manager using only local files, fixture data, and fake Vercel APIs. No task in this plan may call real Vercel projects, mutate real Vercel resources, or depend on live credentials.

**Architecture:** Work is split into two safe lanes. Workstream A improves existing code and tests. Workstream B adds new local/fake-API capabilities. All Vercel behavior must be tested through fake HTTP servers, fixture JSON files, or generated local artifacts. Real-project validation is intentionally out of scope.

**Tech Stack:** Node.js ESM CLI, `node:test`, fake HTTP Vercel API servers, local JSON/Markdown/HTML artifacts, fixture files under `test/fixtures`, no live network/project tests.

---

## Non-Negotiable Safety Rules

- [ ] No task may require real Vercel projects.
- [ ] No task may require real domains.
- [ ] No task may require real credentials beyond existing local unit-test fake tokens.
- [ ] Destructive workflow tests must use fake API servers or local fixture files only.
- [ ] `npm test` must remain the primary verification command.
- [ ] No live smoke script, live validation task, or `VCOPY_LIVE_TESTS` workflow belongs in this plan.

## Coverage Map

This plan explicitly covers all previously discussed follow-up items:

1. Permissions model: Task A4.
2. Config file support: Task B1.
3. Structured exit codes: Task A2.
4. Report schema stability: Task A3.
5. Snapshot/cache support: Task B2.
6. Audit history: Task B3.
7. Policy checks: Task B4.
8. Import/apply from template: Task B5, test-file/fake-API only.
9. Better source scanning: Task B6.
10. Human handoff package: Task B7.
11. Logging/verbosity: Task A5.
12. Command reference docs: Task A6.
13. Security review: Task A7.
14. Real integration tests: intentionally replaced by fixture/fake-API integration tests in Task B8.
15. UX/output consistency: Task A8.

It also includes the earlier six hardening areas:

- test-project validation via fake API/fixtures only: Task B8
- API hardening: Task A9
- test organization: Task A1
- packaging/install: Task A10
- release checklist: Task A11
- future real-project policy decision: Task A12, documented as disabled by default

---

## Workstream A: Improve Existing Code, Tests, Docs, And Safety

### Task A1: Split The Large Test Suite

**Purpose:** Make the test suite maintainable before adding more behavior.

**Files:**
- Create: `test/helpers/cli.mjs`
- Create: `test/helpers/fake-vercel-api.mjs`
- Create: `test/analyze-command.test.mjs`
- Create: `test/env-command.test.mjs`
- Create: `test/duplicate-command.test.mjs`
- Create: `test/reporting-command.test.mjs`
- Create: `test/viewer-command.test.mjs`
- Modify: `test/analyze.test.mjs`

- [ ] **Step 1: Extract CLI runner helper**

Create `test/helpers/cli.mjs`:

```js
import { spawn } from 'node:child_process';

export function runCli(args, env = {}, input = '') {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['src/cli.mjs', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, VERCEL_AUTH_FILE: '', ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    if (input) {
      child.stdin.end(input);
    } else {
      child.stdin.end();
    }
  });
}
```

- [ ] **Step 2: Extract fake API helper**

Move the fake API server from `test/analyze.test.mjs` into `test/helpers/fake-vercel-api.mjs`. Export both `startFakeVercelApi()` and `startDestructiveFakeApi()` so every command test can reuse the same fake API behavior.

- [ ] **Step 3: Move tests by command family**

Move existing tests into focused files:

```txt
test/analyze-command.test.mjs
test/env-command.test.mjs
test/duplicate-command.test.mjs
test/reporting-command.test.mjs
test/viewer-command.test.mjs
test/destructive-workflows.contract.test.mjs
```

Keep `test/analyze.test.mjs` only as a temporary shell until all tests are moved, then delete it.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: all tests pass with the same test count as before the split.

- [ ] **Step 5: Commit**

```bash
git add test
git commit -m "Split CLI test suites"
```

### Task A2: Add Structured Exit Codes

**Purpose:** Make CI and automation behavior predictable.

**Files:**
- Create: `src/cli/exit-codes.mjs`
- Modify: `src/cli.mjs`
- Modify: `src/commands/destructive-safety.mjs`
- Test: `test/reporting-command.test.mjs`
- Test: `test/destructive-workflows.contract.test.mjs`
- Docs: `README.md`

- [ ] **Step 1: Write failing test for unsafe writes**

Add to `test/destructive-workflows.contract.test.mjs`:

```js
test('unsafe destructive writes exit 3', async () => {
  const result = await runCli([
    'domain-move',
    '--from',
    'brand-a-web',
    '--to',
    'vcopy-test-target',
    '--domain',
    'vcopy-test.example.com',
    '--test-project-only',
    '--apply',
    '--yes',
  ], { VERCEL_TOKEN: 'test-token' });

  assert.equal(result.code, 3);
  assert.match(result.stderr, /vcopy-test-/);
});
```

- [ ] **Step 2: Run failing test**

Run: `node --test test/destructive-workflows.contract.test.mjs`

Expected: fails because unsafe write exits `1` today.

- [ ] **Step 3: Add exit constants**

Create `src/cli/exit-codes.mjs`:

```js
export const EXIT_CODES = {
  ok: 0,
  error: 1,
  driftOrBlocked: 2,
  unsafeWriteRefused: 3,
  policyFailed: 4,
};

export class UnsafeWriteError extends Error {
  constructor(message) {
    super(message);
    this.exitCode = EXIT_CODES.unsafeWriteRefused;
  }
}
```

- [ ] **Step 4: Use `UnsafeWriteError`**

Modify `src/commands/destructive-safety.mjs`:

```js
import { UnsafeWriteError } from '../cli/exit-codes.mjs';

export function assertTestProjectWrite(options, projectNames) {
  if (!options.apply || !options.yes || !options.testProjectOnly) {
    throw new UnsafeWriteError('Refusing write without --test-project-only --apply --yes.');
  }

  for (const projectName of projectNames.filter(Boolean)) {
    if (!projectName.startsWith('vcopy-test-')) {
      throw new UnsafeWriteError(`Destructive writes allow only vcopy-test- project names. Refusing ${projectName}.`);
    }
  }
}
```

- [ ] **Step 5: Replace literal exit codes**

In `src/cli.mjs`, import `EXIT_CODES` and replace drift/blocker returns with `EXIT_CODES.driftOrBlocked`.

- [ ] **Step 6: Document exit codes**

Add to `README.md`:

```md
## Exit Codes

- `0`: success
- `1`: usage or runtime error
- `2`: readiness blocker or drift detected
- `3`: unsafe destructive write refused
- `4`: local policy check failed
```

- [ ] **Step 7: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src test README.md
git commit -m "Add structured exit codes"
```

### Task A3: Add Report Schema Versions

**Purpose:** Stabilize JSON outputs for CI, viewer, policy checks, and future tools.

**Files:**
- Create: `src/output/schema-version.mjs`
- Modify: `src/cli.mjs`
- Modify: `src/commands/analyze.mjs`
- Modify: `src/commands/ci.mjs`
- Modify: `src/commands/overview.mjs`
- Modify: `src/commands/template.mjs`
- Modify: `src/commands/template-plan.mjs`
- Modify: `src/commands/viewer.mjs`
- Test: `test/reporting-command.test.mjs`

- [ ] **Step 1: Write failing schema tests**

Add assertions for JSON outputs:

```js
assert.equal(report.schemaVersion, 1);
assert.equal(report.reportType, 'analysis');
```

Cover at least `analyze`, `check`, `diff`, `ci`, `overview`, `template`, and `template-plan`.

- [ ] **Step 2: Run test to verify failure**

Run: `node --test test/reporting-command.test.mjs`

Expected: fails because schema metadata does not exist.

- [ ] **Step 3: Add schema helper**

Create `src/output/schema-version.mjs`:

```js
export const SCHEMA_VERSION = 1;

export function withSchema(reportType, payload) {
  return {
    schemaVersion: SCHEMA_VERSION,
    reportType,
    ...payload,
  };
}
```

- [ ] **Step 4: Wrap JSON outputs**

Use `withSchema()` at JSON output boundaries. Example:

```js
const output = options.format === 'json'
  ? `${JSON.stringify(withSchema('diff', diff), null, 2)}\n`
  : renderDiff(diff);
```

- [ ] **Step 5: Update viewer detection**

In `src/commands/viewer.mjs`, check `data.reportType` first before shape detection.

- [ ] **Step 6: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src test
git commit -m "Add report schema versions"
```

### Task A4: Add Explicit Permissions Model

**Purpose:** Make command safety visible and testable.

**Files:**
- Create: `src/cli/command-registry.mjs`
- Modify: `src/cli.mjs`
- Test: `test/permissions-command.test.mjs`
- Docs: `README.md`

- [ ] **Step 1: Write failing permission registry test**

Create `test/permissions-command.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test**

Run: `node --test test/permissions-command.test.mjs`

Expected: fails because registry does not exist.

- [ ] **Step 3: Create command registry**

Create `src/cli/command-registry.mjs`:

```js
export const COMMANDS = [
  { name: 'analyze', permission: 'read-only' },
  { name: 'check', permission: 'read-only' },
  { name: 'ci', permission: 'read-only' },
  { name: 'diff', permission: 'read-only' },
  { name: 'duplicate', permission: 'test-write' },
  { name: 'env-push', permission: 'test-write' },
  { name: 'env-rm', permission: 'test-write' },
  { name: 'domain-move', permission: 'test-write' },
  { name: 'integration-plan', permission: 'read-only' },
  { name: 'overview', permission: 'read-only' },
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
```

- [ ] **Step 4: Use registry in CLI**

Replace the hard-coded command list in `src/cli.mjs` with `isKnownCommand(command)`.

- [ ] **Step 5: Document permission categories**

Add to `README.md`:

```md
## Permission Categories

- `read-only`: reads Vercel or local files and writes only reports.
- `local-only`: does not require Vercel auth or Vercel API access.
- `test-write`: can mutate only `vcopy-test-*` projects or local test files and requires explicit apply flags.
```

- [ ] **Step 6: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src test README.md
git commit -m "Add command permission registry"
```

### Task A5: Add Logging And Verbosity Controls

**Purpose:** Make output suitable for humans and CI.

**Files:**
- Create: `src/output/logger.mjs`
- Modify: `src/cli.mjs`
- Test: `test/logging-command.test.mjs`
- Docs: `README.md`

- [ ] **Step 1: Write failing logging tests**

Create `test/logging-command.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('quiet suppresses success chatter for local viewer command', async () => {
  const result = await runCli(['viewer', '--out', '/private/tmp/vcopy-quiet-viewer.html', '--quiet'], { VERCEL_TOKEN: '' });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('verbose prints command category', async () => {
  const result = await runCli(['viewer', '--out', '/private/tmp/vcopy-verbose-viewer.html', '--verbose'], { VERCEL_TOKEN: '' });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stderr, /permission: local-only/);
});
```

- [ ] **Step 2: Run tests**

Run: `node --test test/logging-command.test.mjs`

Expected: fails with unknown `--quiet` and `--verbose`.

- [ ] **Step 3: Parse flags**

Add `quiet` and `verbose` to options in `src/cli.mjs`, parse `--quiet` and `--verbose`.

- [ ] **Step 4: Add logger helper**

Create `src/output/logger.mjs`:

```js
export function createLogger(options) {
  return {
    info(message) {
      if (!options.quiet) process.stdout.write(message);
    },
    debug(message) {
      if (options.verbose) process.stderr.write(message);
    },
  };
}
```

- [ ] **Step 5: Use logger for viewer output**

Replace direct `process.stdout.write(output)` for viewer with `logger.info(output)` and log permission category when verbose.

- [ ] **Step 6: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src test README.md
git commit -m "Add quiet and verbose output controls"
```

### Task A6: Add Command Reference Docs

**Purpose:** Document all command behavior in one place.

**Files:**
- Create: `docs/COMMANDS.md`
- Modify: `README.md`
- Test: `test/docs.test.mjs`

- [ ] **Step 1: Write failing docs test**

Create `test/docs.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test**

Run: `node --test test/docs.test.mjs`

Expected: fails because `docs/COMMANDS.md` does not exist.

- [ ] **Step 3: Create command docs**

Create `docs/COMMANDS.md` with one section per command. Each section must include:

```md
## vcopy analyze

Permission: read-only

Purpose: Analyze a Vercel project and export safe config metadata.

Example:

```bash
node src/cli.mjs analyze brand-a-web --out ./analysis.md
```

Writes: report file only.
```

Repeat for every command in `COMMANDS`.

- [ ] **Step 4: Link docs from README**

Add:

```md
See `docs/COMMANDS.md` for the full command reference.
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add docs README.md test/docs.test.mjs
git commit -m "Add command reference docs"
```

### Task A7: Add Security Review Checklist

**Purpose:** Make secret-safety and destructive-safety review repeatable.

**Files:**
- Create: `docs/SECURITY_REVIEW.md`
- Test: `test/docs.test.mjs`

- [ ] **Step 1: Add docs test**

Add to `test/docs.test.mjs`:

```js
test('security review covers secret and destructive safety', async () => {
  const docs = await readFile('docs/SECURITY_REVIEW.md', 'utf8');
  assert.match(docs, /Secret output review/);
  assert.match(docs, /Destructive command review/);
  assert.match(docs, /vcopy-test-/);
  assert.match(docs, /npm test/);
});
```

- [ ] **Step 2: Run test**

Run: `node --test test/docs.test.mjs`

Expected: fails because document does not exist.

- [ ] **Step 3: Create checklist**

Create `docs/SECURITY_REVIEW.md`:

```md
# Security Review Checklist

## Secret output review

- Run `npm test`.
- Confirm JSON and Markdown reports contain env names/scopes only.
- Confirm `secrets-migrate` output names keys but never prints values.
- Confirm generated report artifacts are not committed unless reviewed.

## Destructive command review

- Confirm writes require `--test-project-only --apply --yes`.
- Confirm project writes refuse names that do not start with `vcopy-test-`.
- Confirm domain tests use fake APIs or disposable test domains only.
- Confirm `routing-sync` writes only local fixture files.

## Release review

- Run `git diff --check`.
- Run `npm test`.
- Review `git status --short` for generated artifacts.
```

- [ ] **Step 4: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add docs/SECURITY_REVIEW.md test/docs.test.mjs
git commit -m "Add security review checklist"
```

### Task A8: Standardize UX And Output Sections

**Purpose:** Make command output predictable.

**Files:**
- Create: `src/output/sections.mjs`
- Modify: `src/output/terminal.mjs`
- Modify: destructive command renderers
- Test: command tests for representative commands

- [ ] **Step 1: Write failing output shape test**

Add tests asserting representative commands include consistent headings:

```js
assert.match(result.stdout, /^.+\n\nSummary:\n/m);
assert.match(result.stdout, /Next steps:/);
```

Apply to `check`, `diff`, `secrets-migrate --dry-run`, and `template-plan`.

- [ ] **Step 2: Run tests**

Run: `npm test`

Expected: fails because outputs are not standardized.

- [ ] **Step 3: Add section helper**

Create `src/output/sections.mjs`:

```js
export function renderSections(title, sections) {
  const lines = [title, ''];
  for (const section of sections) {
    lines.push(`${section.title}:`);
    lines.push(...formatItems(section.items));
    lines.push('');
  }
  return lines.join('\n');
}

function formatItems(items) {
  if (!items || items.length === 0) return ['- None'];
  return items.map((item) => `- ${item}`);
}
```

- [ ] **Step 4: Convert representative outputs**

Update at least destructive workflows, `template-plan`, and `ci` first. Leave full conversion to follow-up commits if needed, but tests must cover converted commands.

- [ ] **Step 5: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src test
git commit -m "Standardize command output sections"
```

### Task A9: Harden Fake API Error Handling

**Purpose:** Improve behavior for API 403/404/409 and partial failures using fake APIs only.

**Files:**
- Modify: `src/vercel/client.mjs`
- Modify: command files that catch errors
- Test: `test/api-error-handling.test.mjs`

- [ ] **Step 1: Write fake API error tests**

Create `test/api-error-handling.test.mjs` with fake server routes for:

```js
response.statusCode = 403;
response.end(JSON.stringify({ error: { message: 'Forbidden' } }));
```

Assert command stderr includes:

```js
assert.match(result.stderr, /Forbidden/);
assert.match(result.stderr, /No changes were made|manual recovery/i);
```

Cover `domain-move`, `protection-sync`, and `secrets-migrate`.

- [ ] **Step 2: Run tests**

Run: `node --test test/api-error-handling.test.mjs`

Expected: fails because messages are too generic or lack recovery text.

- [ ] **Step 3: Add contextual error messages**

Wrap each destructive command write sequence with contextual errors. Example for `domain-move`:

```js
try {
  await removeProjectDomain(...);
  await addProjectDomain(...);
} catch (error) {
  throw new Error(`Domain move failed before completion. Review source and target domains manually. ${error.message}`);
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src test
git commit -m "Harden API error handling"
```

### Task A10: Add Packaging And Install Docs

**Purpose:** Make local installation repeatable.

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Create: `docs/INSTALL.md`
- Test: `test/package.test.mjs`

- [ ] **Step 1: Write package metadata test**

Create `test/package.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package exposes vcopy bin and version', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(pkg.bin.vcopy, './src/cli.mjs');
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
});
```

- [ ] **Step 2: Add `--version` test**

Add CLI test:

```js
const result = await runCli(['--version'], { VERCEL_TOKEN: '' });
assert.equal(result.code, 0);
assert.match(result.stdout, /0\.1\.0/);
```

- [ ] **Step 3: Implement `--version`**

Read `package.json` in `src/cli.mjs` when command is `--version`.

- [ ] **Step 4: Write install docs**

Create `docs/INSTALL.md`:

```md
# Install

```bash
npm install
npm link
vcopy --help
vcopy --version
```

For development:

```bash
node src/cli.mjs --help
npm test
```
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add package.json src/cli.mjs docs/INSTALL.md README.md test
git commit -m "Add install and version support"
```

### Task A11: Add Release Checklist

**Purpose:** Make releases repeatable without relying on memory.

**Files:**
- Create: `docs/RELEASE.md`
- Test: `test/docs.test.mjs`

- [ ] **Step 1: Add docs test**

Add:

```js
test('release checklist includes verification gates', async () => {
  const docs = await readFile('docs/RELEASE.md', 'utf8');
  assert.match(docs, /npm test/);
  assert.match(docs, /git diff --check/);
  assert.match(docs, /SECURITY_REVIEW/);
  assert.match(docs, /vcopy-test-/);
});
```

- [ ] **Step 2: Create release docs**

Create `docs/RELEASE.md`:

```md
# Release Checklist

1. Run `git status --short`.
2. Run `git diff --check`.
3. Run `npm test`.
4. Review `docs/SECURITY_REVIEW.md`.
5. Confirm no generated reports or secrets are staged.
6. Confirm destructive workflows still refuse non-`vcopy-test-*` projects.
7. Update `package.json` version.
8. Commit and tag the release.
```

- [ ] **Step 3: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add docs/RELEASE.md test/docs.test.mjs
git commit -m "Add release checklist"
```

### Task A12: Document Future Real-Project Policy As Disabled

**Purpose:** Capture the decision that real project mutation is not enabled.

**Files:**
- Create: `docs/REAL_PROJECT_POLICY.md`
- Test: `test/docs.test.mjs`

- [ ] **Step 1: Add docs test**

```js
test('real project policy says real writes are disabled', async () => {
  const docs = await readFile('docs/REAL_PROJECT_POLICY.md', 'utf8');
  assert.match(docs, /disabled by default/i);
  assert.match(docs, /vcopy-test-/);
  assert.match(docs, /allowlist/);
  assert.match(docs, /dry-run artifact/);
});
```

- [ ] **Step 2: Create policy doc**

Create `docs/REAL_PROJECT_POLICY.md`:

```md
# Real Project Mutation Policy

Real project mutation is disabled by default.

Current write commands may mutate only:

- `vcopy-test-*` projects
- local test fixture files

Before any future real-project write support exists, the tool must add:

- explicit project allowlist config
- mandatory dry-run artifact
- artifact hash confirmation before apply
- typed target project confirmation
- security review update
```

- [ ] **Step 3: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add docs/REAL_PROJECT_POLICY.md test/docs.test.mjs
git commit -m "Document real project mutation policy"
```

---

## Workstream B: Add Local Or Fake-API Product Capabilities

### Task B1: Add `.vcopyrc.json` Config Support

**Purpose:** Centralize safe defaults without requiring CLI repetition.

**Files:**
- Create: `src/config/load-config.mjs`
- Modify: `src/cli.mjs`
- Test: `test/config-command.test.mjs`
- Docs: `README.md`, `docs/EXAMPLES.md`

- [ ] **Step 1: Write failing config test**

```js
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('loads defaults from .vcopyrc.json', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-config-'));
  try {
    const config = join(dir, '.vcopyrc.json');
    await writeFile(config, JSON.stringify({
      teamId: 'team_from_config',
      testProjectPrefix: 'vcopy-test-',
      defaultOutDir: './vcopy-reports'
    }, null, 2));

    const result = await runCli(['viewer', '--config', config, '--out', join(dir, 'viewer.html')], { VERCEL_TOKEN: '' });
    assert.equal(result.code, 0, result.stderr);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test**

Run: `node --test test/config-command.test.mjs`

Expected: unknown `--config`.

- [ ] **Step 3: Implement loader**

Create `src/config/load-config.mjs`:

```js
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function loadVcopyConfig(path) {
  if (!path) return {};
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}
```

- [ ] **Step 4: Wire CLI**

Parse `--config`, load it, and merge `teamId`, `testProjectPrefix`, and `defaultOutDir`.

- [ ] **Step 5: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src/config src/cli.mjs test/config-command.test.mjs README.md docs/EXAMPLES.md
git commit -m "Add vcopy config file support"
```

### Task B2: Add Snapshot Cache Support

**Purpose:** Allow local diffing against last known good snapshots without new Vercel calls.

**Files:**
- Create: `src/commands/snapshot-save.mjs`
- Create: `src/commands/snapshot-diff.mjs`
- Test: `test/snapshot-command.test.mjs`
- Docs: `README.md`

- [ ] **Step 1: Write failing snapshot tests**

Create `test/snapshot-command.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('snapshot-diff compares two local analysis reports', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-snapshot-'));
  try {
    const left = join(dir, 'left.json');
    const right = join(dir, 'right.json');
    await writeFile(left, JSON.stringify({ reportType: 'analysis', project: { name: 'a', framework: 'nextjs' }, envs: [{ key: 'A', target: ['production'] }], domains: [] }));
    await writeFile(right, JSON.stringify({ reportType: 'analysis', project: { name: 'b', framework: 'nextjs' }, envs: [], domains: [] }));

    const result = await runCli(['snapshot-diff', '--left', left, '--right', right], { VERCEL_TOKEN: '' });
    assert.equal(result.code, 2);
    assert.match(result.stdout, /Missing from b/);
    assert.match(result.stdout, /A/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test**

Run: `node --test test/snapshot-command.test.mjs`

Expected: unknown command.

- [ ] **Step 3: Implement local snapshot diff**

Create `src/commands/snapshot-diff.mjs` that reads two analysis JSON files, converts them into the shape expected by `diffSnapshots()`, renders with `renderDiff()`, and exits `2` if drift exists.

- [ ] **Step 4: Implement snapshot save**

Create `src/commands/snapshot-save.mjs` that copies a report into a timestamped file under a local cache directory.

- [ ] **Step 5: Wire CLI and run tests**

Add local-only `snapshot-save` and `snapshot-diff` commands.

Run: `npm test`

- [ ] **Step 6: Commit**

```bash
git add src test README.md
git commit -m "Add local snapshot cache commands"
```

### Task B3: Add Audit History Snapshots

**Purpose:** Store timestamped local copies of reports for trend tracking.

**Files:**
- Create: `src/commands/audit-save.mjs`
- Test: `test/audit-history.test.mjs`
- Docs: `README.md`

- [ ] **Step 1: Write failing test**

```js
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('audit-save stores a timestamped report copy', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-audit-'));
  try {
    const report = join(dir, 'ci.json');
    const outDir = join(dir, 'history');
    await writeFile(report, JSON.stringify({ schemaVersion: 1, reportType: 'ci', status: 'passed' }));
    const result = await runCli(['audit-save', '--report', report, '--out-dir', outDir], { VERCEL_TOKEN: '' });
    assert.equal(result.code, 0, result.stderr);
    const files = await readdir(outDir);
    assert.equal(files.length, 1);
    const saved = JSON.parse(await readFile(join(outDir, files[0]), 'utf8'));
    assert.equal(saved.reportType, 'ci');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Implement and test**

Implement `src/commands/audit-save.mjs` as a local-only report copier. Run `npm test`.

- [ ] **Step 3: Commit**

```bash
git add src test README.md
git commit -m "Add audit history snapshots"
```

### Task B4: Add Local Policy Checks

**Purpose:** Let users enforce required env keys and forbidden public keys without Vercel calls.

**Files:**
- Create: `src/commands/policy-check.mjs`
- Create: `src/policy/evaluate-policy.mjs`
- Test: `test/policy-command.test.mjs`
- Docs: `README.md`, `docs/EXAMPLES.md`

- [ ] **Step 1: Write failing policy test**

```js
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('policy-check fails when required env keys are missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-policy-'));
  try {
    const report = join(dir, 'analysis.json');
    const policy = join(dir, 'policy.json');
    await writeFile(report, JSON.stringify({ reportType: 'analysis', envs: [{ key: 'DATABASE_URL', target: ['production'] }] }));
    await writeFile(policy, JSON.stringify({ requiredEnvKeys: ['DATABASE_URL', 'OPENAI_API_KEY'] }));
    const result = await runCli(['policy-check', '--report', report, '--policy', policy], { VERCEL_TOKEN: '' });
    assert.equal(result.code, 4);
    assert.match(result.stdout, /OPENAI_API_KEY missing/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Implement evaluator and command**

Create `src/policy/evaluate-policy.mjs` and `src/commands/policy-check.mjs`. The command must be local-only and return exit `4` when policy fails.

- [ ] **Step 3: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src test README.md docs/EXAMPLES.md
git commit -m "Add local policy checks"
```

### Task B5: Add Template Apply Plan And Test-Only Apply

**Purpose:** Complete template import/apply without touching real projects.

**Files:**
- Create: `src/commands/template-apply.mjs`
- Test: `test/template-apply.test.mjs`
- Docs: `README.md`, `docs/EXAMPLES.md`

- [ ] **Step 1: Write fake API test**

Create `test/template-apply.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startDestructiveFakeApi } from './helpers/fake-vercel-api.mjs';

test('template-apply creates only vcopy-test projects through fake API', async () => {
  const api = await startDestructiveFakeApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-template-apply-'));
  try {
    const template = join(dir, 'template.json');
    await writeFile(template, JSON.stringify({
      kind: 'vercel-project-template',
      project: { framework: 'nextjs', rootDirectory: 'apps/web' },
      env: [{ key: 'DATABASE_URL', target: ['preview'], type: 'encrypted' }]
    }));
    const result = await runCli(['template-apply', '--template', template, '--to', 'vcopy-test-template-target', '--api-base', api.apiBase, '--test-project-only', '--apply', '--yes'], { VERCEL_TOKEN: 'test-token' });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Template applied/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test**

Run: `node --test test/template-apply.test.mjs`

Expected: unknown command.

- [ ] **Step 3: Implement command**

`template-apply` must:

- read a local template file
- refuse target names not starting with `vcopy-test-`
- require `--test-project-only --apply --yes` for writes
- create project through fake API in tests
- never create env values, only output placeholder checklist

- [ ] **Step 4: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src test README.md docs/EXAMPLES.md
git commit -m "Add test-scoped template apply"
```

### Task B6: Improve Source Env Scanning

**Purpose:** Catch more source-code env references without external dependencies.

**Files:**
- Modify: `src/analysis/scan-code-env.mjs`
- Test: `test/source-scan.test.mjs`

- [ ] **Step 1: Write failing scan tests**

Create `test/source-scan.test.mjs` with files containing:

```js
const { DATABASE_URL, OPENAI_API_KEY: OPENAI } = process.env;
const stripe = process.env['STRIPE_SECRET_KEY'];
const sentry = process.env[`SENTRY_DSN`];
```

Assert scanner returns all four keys.

- [ ] **Step 2: Run test**

Run: `node --test test/source-scan.test.mjs`

Expected: bracket/destructuring cases fail.

- [ ] **Step 3: Improve scanner**

Update `scan-code-env.mjs` with regexes for:

```js
/process\.env\.([A-Z0-9_]+)/g
/process\.env\[['"`]([A-Z0-9_]+)['"`]\]/g
/const\s*{([^}]+)}\s*=\s*process\.env/g
```

For destructuring, split on commas and remove aliases after `:`.

- [ ] **Step 4: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src/analysis/scan-code-env.mjs test/source-scan.test.mjs
git commit -m "Improve source env scanning"
```

### Task B7: Add Human Handoff Package

**Purpose:** Generate a local folder containing reports, template, checklist, and viewer.

**Files:**
- Create: `src/commands/handoff-package.mjs`
- Test: `test/handoff-package.test.mjs`
- Docs: `README.md`

- [ ] **Step 1: Write failing handoff test**

```js
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('handoff-package creates local package folder', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-handoff-'));
  try {
    const report = join(dir, 'analysis.json');
    await writeFile(report, JSON.stringify({ reportType: 'analysis', project: { name: 'brand-a-web' }, envs: [] }));
    const outDir = join(dir, 'handoff');
    const result = await runCli(['handoff-package', '--report', report, '--out-dir', outDir], { VERCEL_TOKEN: '' });
    assert.equal(result.code, 0, result.stderr);
    const files = await readdir(outDir);
    assert.ok(files.includes('analysis.json'));
    assert.ok(files.includes('README.md'));
    assert.ok(files.includes('vcopy-viewer.html'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Implement command**

The command must copy the input report, generate `README.md`, and generate the static viewer using the existing viewer HTML renderer.

- [ ] **Step 3: Run tests and commit**

Run: `npm test`

Commit:

```bash
git add src test README.md
git commit -m "Add local handoff packages"
```

### Task B8: Replace Real Integration Tests With Fixture Integration Tests

**Purpose:** Validate end-to-end flows without real projects.

**Files:**
- Create: `test/fixture-integration.test.mjs`
- Modify: `test/helpers/fake-vercel-api.mjs`

- [ ] **Step 1: Write fixture integration test**

Create `test/fixture-integration.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startFakeVercelApi } from './helpers/fake-vercel-api.mjs';

test('fixture integration flow produces analysis ci template and viewer artifacts', async () => {
  const api = await startFakeVercelApi();
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-flow-'));
  try {
    const analysis = join(dir, 'analysis.json');
    const ci = join(dir, 'ci.md');
    const template = join(dir, 'template.json');
    const viewer = join(dir, 'viewer.html');

    assert.equal((await runCli(['analyze', 'brand-a-web', '--api-base', api.apiBase, '--format', 'json', '--out', analysis], { VERCEL_TOKEN: 'test-token' })).code, 0);
    assert.ok([0, 2].includes((await runCli(['ci', '--from', 'brand-a-web', '--to', 'brand-b-web', '--api-base', api.apiBase, '--out', ci], { VERCEL_TOKEN: 'test-token' })).code));
    assert.equal((await runCli(['template', 'brand-a-web', '--api-base', api.apiBase, '--out', template], { VERCEL_TOKEN: 'test-token' })).code, 0);
    assert.equal((await runCli(['viewer', '--out', viewer], { VERCEL_TOKEN: '' })).code, 0);

    assert.match(await readFile(analysis, 'utf8'), /brand-a-web/);
    assert.match(await readFile(ci, 'utf8'), /Vercel config CI/);
    assert.match(await readFile(template, 'utf8'), /vercel-project-template/);
    assert.match(await readFile(viewer, 'utf8'), /Vercel Config Manager/);
  } finally {
    await api.close();
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run fixture integration test**

Run: `node --test test/fixture-integration.test.mjs`

Expected: pass using fake API only.

- [ ] **Step 3: Run full tests and commit**

Run: `npm test`

Commit:

```bash
git add test
git commit -m "Add fixture integration flow"
```

---

## Execution Order

1. A1 split test suites.
2. A2 structured exit codes.
3. A4 permissions model.
4. A3 schema versions.
5. B1 config file support.
6. B4 policy checks.
7. B2 snapshot cache.
8. B3 audit history.
9. B5 template apply in fake API/test scope only.
10. B6 source scanning.
11. B7 handoff package.
12. A5 logging/verbosity.
13. A6 command docs.
14. A7 security review checklist.
15. A8 UX consistency.
16. A9 API hardening through fake API tests.
17. A10 packaging/install docs.
18. A11 release checklist.
19. A12 real project mutation policy disabled.
20. B8 fixture integration flow.

## Plan Self-Review

- All 15 requested follow-up items are explicitly mapped.
- The earlier six hardening areas are explicitly mapped.
- Real project testing is not included.
- Every behavior can be tested with local files or fake API servers.
- Destructive behavior remains constrained to fixture files or fake `vcopy-test-*` resources.
