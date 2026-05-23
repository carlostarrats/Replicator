# Vercel Config Manager Hardening And Live Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing Vercel Config Manager after MVP completion, add serious product-management primitives, and validate guarded write workflows only against `vcopy-test-*` resources.

**Architecture:** Split the remaining work into three lanes: local code/test improvements, new product additions built from existing commands, and opt-in live validation. Local work must be fully testable with fake APIs or local files. Live work must never run unless explicitly enabled and must target only `vcopy-test-*` projects/domains.

**Tech Stack:** Node.js ESM CLI, `node:test`, fake HTTP Vercel API servers, local JSON/Markdown artifacts, optional real Vercel CLI/API credentials for live smoke tests.

---

## Workstream A: Improve Existing Code And Tests

These tasks improve what already exists without adding major product surface.

### Task A1: Split The Large Test Suite

**Files:**
- Create: `test/helpers/cli.mjs`
- Create: `test/helpers/fake-vercel-api.mjs`
- Create: `test/analyze-command.test.mjs`
- Create: `test/env-command.test.mjs`
- Create: `test/duplicate-command.test.mjs`
- Create: `test/reporting-command.test.mjs`
- Modify: `test/analyze.test.mjs`

- [ ] **Step 1: Extract the CLI runner helper**

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

- [ ] **Step 2: Run the current suite**

Run: `npm test`

Expected: tests still pass before moving test bodies.

- [ ] **Step 3: Extract fake API server**

Move the `startFakeVercelApi` helper from `test/analyze.test.mjs` into `test/helpers/fake-vercel-api.mjs` and export it:

```js
import { createServer } from 'node:http';

export async function startFakeVercelApi(options = {}) {
  const requests = [];
  const rateLimitedPaths = new Set();
  const server = createServer((request, response) => {
    let requestBody = '';
    request.on('data', (chunk) => {
      requestBody += chunk;
    });
    request.on('end', () => handleRequest(request, response, requestBody));
  });

  function handleRequest(request, response, requestBody) {
    requests.push({
      method: request.method,
      url: request.url,
      auth: request.headers.authorization,
      body: requestBody ? JSON.parse(requestBody) : undefined,
    });

    const url = new URL(request.url, 'http://localhost');
    response.setHeader('content-type', 'application/json');

    if (options.rateLimitProjectOnce && url.pathname === '/v9/projects/brand-a-web' && !rateLimitedPaths.has(url.pathname)) {
      rateLimitedPaths.add(url.pathname);
      response.statusCode = 429;
      response.setHeader('retry-after', '0');
      response.end(JSON.stringify({ error: { message: 'Rate limited' } }));
      return;
    }

    // Preserve the exact fake routes currently defined in test/analyze.test.mjs.
    options.route?.({ request, response, requestBody, url, requests });
  }

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    apiBase: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
```

Then paste the current route logic into a local `defaultFakeVercelRoute()` exported from the same file.

- [ ] **Step 4: Move tests by command area**

Move tests into focused files:

```txt
test/analyze-command.test.mjs
test/env-command.test.mjs
test/duplicate-command.test.mjs
test/reporting-command.test.mjs
test/destructive-workflows.contract.test.mjs
```

Keep imports explicit:

```js
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';
import { startFakeVercelApi } from './helpers/fake-vercel-api.mjs';
```

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: all tests pass with the same count as before the split.

- [ ] **Step 6: Commit**

```bash
git add test
git commit -m "Split CLI test suites"
```

### Task A2: Add Structured Exit Codes

**Files:**
- Create: `src/cli/exit-codes.mjs`
- Modify: `src/cli.mjs`
- Modify: `test/reporting-command.test.mjs`
- Modify: `test/destructive-workflows.contract.test.mjs`
- Modify: `README.md`

- [ ] **Step 1: Write failing tests**

Add tests that assert:

```js
assert.equal(result.code, 2, 'drift/blocker exits 2');
assert.equal(refused.code, 3, 'unsafe destructive write exits 3');
```

Use an unsafe destructive command like:

```js
const refused = await runCli([
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test test/destructive-workflows.contract.test.mjs`

Expected: unsafe write test fails because it currently exits `1`, not `3`.

- [ ] **Step 3: Add exit code constants**

Create `src/cli/exit-codes.mjs`:

```js
export const EXIT_CODES = {
  ok: 0,
  error: 1,
  driftOrBlocked: 2,
  unsafeWriteRefused: 3,
};

export class UnsafeWriteError extends Error {
  constructor(message) {
    super(message);
    this.exitCode = EXIT_CODES.unsafeWriteRefused;
  }
}
```

- [ ] **Step 4: Use the unsafe error**

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

- [ ] **Step 5: Update `src/cli.mjs` to use constants**

Replace literal `2` returns with `EXIT_CODES.driftOrBlocked`.

- [ ] **Step 6: Document exit codes**

Add to `README.md`:

```md
## Exit Codes

- `0`: success
- `1`: usage or runtime error
- `2`: readiness blocker or drift detected
- `3`: unsafe destructive write refused
```

- [ ] **Step 7: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/cli src/cli.mjs src/commands/destructive-safety.mjs test README.md
git commit -m "Add structured exit codes"
```

### Task A3: Add JSON Schema Versions

**Files:**
- Create: `src/output/schema-version.mjs`
- Modify: JSON output commands in `src/commands/*.mjs`
- Modify: `src/cli.mjs`
- Modify: viewer rendering in `src/commands/viewer.mjs`
- Test: `test/reporting-command.test.mjs`

- [ ] **Step 1: Write failing test**

Add assertions that JSON outputs include schema metadata:

```js
assert.equal(report.schemaVersion, 1);
assert.equal(report.reportType, 'analysis');
```

Cover at least `analyze`, `check`, `diff`, `ci`, `overview`, `template`, and `template-plan`.

- [ ] **Step 2: Run test**

Run: `node --test test/reporting-command.test.mjs`

Expected: failure because schema fields do not exist.

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

Use `withSchema()` at JSON output boundaries. Example for diff:

```js
const output = options.format === 'json'
  ? `${JSON.stringify(withSchema('diff', diff), null, 2)}\n`
  : renderDiff(diff);
```

- [ ] **Step 5: Update viewer detection**

In `src/commands/viewer.mjs`, prefer `data.reportType` before shape-based detection:

```js
if (data.reportType === 'ci') return renderCi(data);
if (data.reportType === 'analysis') return renderAnalysis(data);
```

- [ ] **Step 6: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src test README.md
git commit -m "Add report schema versions"
```

## Workstream B: Add Product Capabilities On Existing Foundation

These are new additions but still local/fake-API testable.

### Task B1: Add `.vcopyrc.json` Config Support

**Files:**
- Create: `src/config/load-config.mjs`
- Modify: `src/cli.mjs`
- Test: `test/config-command.test.mjs`
- Docs: `README.md`, `docs/EXAMPLES.md`

- [ ] **Step 1: Write failing config test**

Create `test/config-command.test.mjs`:

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
    await writeFile(join(dir, '.vcopyrc.json'), JSON.stringify({
      teamId: 'team_from_config',
      testProjectPrefix: 'vcopy-test-',
      defaultOutDir: './vcopy-reports'
    }, null, 2));

    const result = await runCli([
      'viewer',
      '--config',
      join(dir, '.vcopyrc.json'),
      '--out',
      join(dir, 'viewer.html')
    ], { VERCEL_TOKEN: '' });

    assert.equal(result.code, 0, result.stderr);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test**

Run: `node --test test/config-command.test.mjs`

Expected: fails with unknown `--config`.

- [ ] **Step 3: Add config loader**

Create `src/config/load-config.mjs`:

```js
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function loadVcopyConfig(path) {
  if (!path) {
    return {};
  }
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}
```

- [ ] **Step 4: Wire `--config` into `src/cli.mjs`**

Add `configFile` to parsed options and load it before token/team defaults are finalized:

```js
if (arg === '--config') {
  options.configFile = requireValue(args, index, arg);
  index += 1;
  continue;
}
```

Then:

```js
const config = await loadVcopyConfig(options.configFile);
options.teamId = options.teamId || config.teamId || process.env.VERCEL_TEAM_ID;
options.testProjectPrefix = config.testProjectPrefix || 'vcopy-test-';
```

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/config src/cli.mjs test/config-command.test.mjs README.md docs/EXAMPLES.md
git commit -m "Add vcopy config file support"
```

### Task B2: Add Policy Checks

**Files:**
- Create: `src/commands/policy-check.mjs`
- Create: `src/policy/evaluate-policy.mjs`
- Test: `test/policy-command.test.mjs`
- Docs: `README.md`, `docs/EXAMPLES.md`

- [ ] **Step 1: Write failing policy test**

Create `test/policy-command.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('policy-check fails when required env keys are missing from analysis JSON', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-policy-'));
  try {
    const analysis = join(dir, 'analysis.json');
    const policy = join(dir, 'policy.json');
    await writeFile(analysis, JSON.stringify({
      schemaVersion: 1,
      reportType: 'analysis',
      project: { name: 'brand-a-web' },
      envs: [{ key: 'DATABASE_URL', target: ['production'] }]
    }));
    await writeFile(policy, JSON.stringify({
      requiredEnvKeys: ['DATABASE_URL', 'OPENAI_API_KEY'],
      forbiddenPublicEnvKeys: ['NEXT_PUBLIC_SECRET']
    }));

    const result = await runCli([
      'policy-check',
      '--report',
      analysis,
      '--policy',
      policy
    ], { VERCEL_TOKEN: '' });

    assert.equal(result.code, 2);
    assert.match(result.stdout, /OPENAI_API_KEY missing/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test**

Run: `node --test test/policy-command.test.mjs`

Expected: fails with unknown command.

- [ ] **Step 3: Implement policy evaluator**

Create `src/policy/evaluate-policy.mjs`:

```js
export function evaluatePolicy(report, policy) {
  const envKeys = new Set((report.envs || []).map((env) => env.key));
  const failures = [];

  for (const key of policy.requiredEnvKeys || []) {
    if (!envKeys.has(key)) {
      failures.push(`${key} missing`);
    }
  }

  for (const key of policy.forbiddenPublicEnvKeys || []) {
    if (envKeys.has(key)) {
      failures.push(`${key} is forbidden`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
```

- [ ] **Step 4: Implement command**

Create `src/commands/policy-check.mjs`:

```js
import { readFile } from 'node:fs/promises';
import { evaluatePolicy } from '../policy/evaluate-policy.mjs';

export async function checkPolicy(options) {
  if (!options.reportFile || !options.policyFile) {
    throw new Error('Usage: vcopy policy-check --report <analysis.json> --policy <policy.json>');
  }
  const report = JSON.parse(await readFile(options.reportFile, 'utf8'));
  const policy = JSON.parse(await readFile(options.policyFile, 'utf8'));
  const result = evaluatePolicy(report, policy);
  const output = [
    result.passed ? 'Policy check passed' : 'Policy check failed',
    '',
    ...(result.failures.length ? result.failures.map((failure) => `- ${failure}`) : ['- None']),
    '',
  ].join('\n');
  return { exitCode: result.passed ? 0 : 2, output };
}
```

- [ ] **Step 5: Wire CLI args**

Add `--report` and `--policy` args to `src/cli.mjs`, mark `policy-check` local-only, and return `result.exitCode`.

- [ ] **Step 6: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src test README.md docs/EXAMPLES.md
git commit -m "Add local policy checks"
```

### Task B3: Add Audit History

**Files:**
- Create: `src/commands/audit-save.mjs`
- Test: `test/audit-history.test.mjs`
- Docs: `README.md`

- [ ] **Step 1: Write failing audit history test**

Create `test/audit-history.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from './helpers/cli.mjs';

test('audit-save stores a timestamped copy of a report', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vcopy-audit-'));
  try {
    const report = join(dir, 'ci.json');
    const outDir = join(dir, 'history');
    await writeFile(report, JSON.stringify({ schemaVersion: 1, reportType: 'ci', status: 'passed' }));

    const result = await runCli([
      'audit-save',
      '--report',
      report,
      '--out-dir',
      outDir
    ], { VERCEL_TOKEN: '' });

    assert.equal(result.code, 0, result.stderr);
    const files = await readdir(outDir);
    assert.equal(files.length, 1);
    assert.match(files[0], /^ci-\d{4}-\d{2}-\d{2}T/);
    const saved = JSON.parse(await readFile(join(outDir, files[0]), 'utf8'));
    assert.equal(saved.reportType, 'ci');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test**

Run: `node --test test/audit-history.test.mjs`

Expected: fails with unknown command.

- [ ] **Step 3: Implement command**

Create `src/commands/audit-save.mjs`:

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

export async function saveAudit(options) {
  if (!options.reportFile || !options.outDir) {
    throw new Error('Usage: vcopy audit-save --report <report.json> --out-dir <dir>');
  }
  const raw = await readFile(options.reportFile, 'utf8');
  const parsed = JSON.parse(raw);
  const reportType = parsed.reportType || basename(options.reportFile, '.json');
  const stamp = new Date().toISOString().replace(/:/g, '-');
  await mkdir(options.outDir, { recursive: true });
  const out = join(options.outDir, `${reportType}-${stamp}.json`);
  await writeFile(out, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return `Audit saved to ${out}\n`;
}
```

- [ ] **Step 4: Wire CLI**

Add local-only command `audit-save`, parse `--report` and `--out-dir`.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src test README.md
git commit -m "Add audit history snapshots"
```

## Workstream C: Opt-In Live Validation Against Real Test Resources

These tasks are separated from unit tests. They must never run by default.

### Task C1: Add Live Test Gate And Script

**Files:**
- Create: `scripts/live-smoke.mjs`
- Modify: `package.json`
- Create: `docs/LIVE_TESTING.md`

- [ ] **Step 1: Create live smoke script**

Create `scripts/live-smoke.mjs`:

```js
import { spawnSync } from 'node:child_process';

const required = [
  'VCOPY_LIVE_TESTS',
  'VERCEL_TOKEN',
  'VCOPY_TEST_SOURCE',
  'VCOPY_TEST_TARGET',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Live tests are opt-in and require vcopy-test-* projects.`);
    process.exit(1);
  }
}

for (const key of ['VCOPY_TEST_SOURCE', 'VCOPY_TEST_TARGET']) {
  if (!process.env[key].startsWith('vcopy-test-')) {
    console.error(`${key} must start with vcopy-test-. Refusing ${process.env[key]}.`);
    process.exit(3);
  }
}

const commands = [
  ['src/cli.mjs', 'analyze', process.env.VCOPY_TEST_SOURCE, '--format', 'json', '--out', '/private/tmp/vcopy-live-analysis.json'],
  ['src/cli.mjs', 'ci', '--from', process.env.VCOPY_TEST_SOURCE, '--to', process.env.VCOPY_TEST_TARGET, '--out', '/private/tmp/vcopy-live-ci.md'],
  ['src/cli.mjs', 'integration-plan', '--from', process.env.VCOPY_TEST_SOURCE, '--to', process.env.VCOPY_TEST_TARGET, '--dry-run'],
  ['src/cli.mjs', 'protection-sync', '--from', process.env.VCOPY_TEST_SOURCE, '--to', process.env.VCOPY_TEST_TARGET, '--dry-run'],
];

for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (![0, 2].includes(result.status)) {
    process.exit(result.status || 1);
  }
}
```

- [ ] **Step 2: Add npm script**

Modify `package.json`:

```json
"scripts": {
  "test": "node --test",
  "test:live": "node scripts/live-smoke.mjs"
}
```

- [ ] **Step 3: Document live testing**

Create `docs/LIVE_TESTING.md`:

```md
# Live Testing

Live tests are opt-in and must target disposable projects whose names start with `vcopy-test-`.

Required environment variables:

- `VCOPY_LIVE_TESTS=1`
- `VERCEL_TOKEN`
- `VCOPY_TEST_SOURCE=vcopy-test-source`
- `VCOPY_TEST_TARGET=vcopy-test-target`

Run:

```bash
npm run test:live
```

The script refuses non-`vcopy-test-*` project names.
```

- [ ] **Step 4: Run local unit tests**

Run: `npm test`

Expected: unit tests pass. Do not run `npm run test:live` unless the user explicitly approves real test-project calls.

- [ ] **Step 5: Commit**

```bash
git add scripts/live-smoke.mjs package.json docs/LIVE_TESTING.md
git commit -m "Add opt-in live smoke tests"
```

### Task C2: Run Live Read-Only Validation

**Prerequisites:**
- Existing real Vercel projects named like `vcopy-test-source` and `vcopy-test-target`
- `VERCEL_TOKEN` available
- User confirms live validation can run

- [ ] **Step 1: Confirm target projects**

Run:

```bash
node src/cli.mjs projects | rg 'vcopy-test-'
```

Expected: only disposable `vcopy-test-*` projects are selected.

- [ ] **Step 2: Run read-only live smoke**

Run:

```bash
VCOPY_LIVE_TESTS=1 \
VCOPY_TEST_SOURCE=vcopy-test-source \
VCOPY_TEST_TARGET=vcopy-test-target \
npm run test:live
```

Expected: commands complete with exit `0` or `2` for drift/blocker reports.

- [ ] **Step 3: Save outputs**

Copy generated files from `/private/tmp/vcopy-live-*` into a local report folder if the user wants a record:

```bash
mkdir -p vcopy-reports/live
cp /private/tmp/vcopy-live-analysis.json vcopy-reports/live/
cp /private/tmp/vcopy-live-ci.md vcopy-reports/live/
```

Do not commit live reports unless the user explicitly asks after reviewing for sensitive metadata.

### Task C3: Run Live Test-Scoped Write Validation

**Prerequisites:**
- User explicitly approves writes to disposable `vcopy-test-*` projects
- A disposable domain or env key is available for test use
- Never use a customer, production, or personal project

- [ ] **Step 1: Test secret migration with dummy value**

Create a temporary `.env` outside the repo:

```bash
printf 'VCOPY_DUMMY_TOKEN=dummy-live-test-value\n' > /private/tmp/vcopy-live.env
```

Run:

```bash
node src/cli.mjs secrets-migrate \
  --from vcopy-test-source \
  --to vcopy-test-target \
  --env-file /private/tmp/vcopy-live.env \
  --keys VCOPY_DUMMY_TOKEN \
  --target preview \
  --test-project-only \
  --apply \
  --yes
```

Expected: output names `VCOPY_DUMMY_TOKEN` but does not print `dummy-live-test-value`.

- [ ] **Step 2: Remove dummy env from test target**

Run existing guarded env removal if the Vercel env entry is single-target:

```bash
node src/cli.mjs env-rm vcopy-test-target --key VCOPY_DUMMY_TOKEN --target preview --dry-run
node src/cli.mjs env-rm vcopy-test-target --key VCOPY_DUMMY_TOKEN --target preview --apply --yes
```

Expected: dummy key removed from test target.

- [ ] **Step 3: Test deployment protection dry-run before apply**

Run:

```bash
node src/cli.mjs protection-sync --from vcopy-test-source --to vcopy-test-target --dry-run
```

Review output. Only after confirming both projects are disposable, run:

```bash
node src/cli.mjs protection-sync --from vcopy-test-source --to vcopy-test-target --test-project-only --apply --yes
```

Expected: protected settings sync, bypass secrets skipped.

- [ ] **Step 4: Domain move**

Only run if a disposable test domain is configured and safe to move. Use:

```bash
node src/cli.mjs domain-move \
  --from vcopy-test-source \
  --to vcopy-test-target \
  --domain vcopy-test.example.com \
  --dry-run
```

Then apply only if the dry run is exactly correct:

```bash
node src/cli.mjs domain-move \
  --from vcopy-test-source \
  --to vcopy-test-target \
  --domain vcopy-test.example.com \
  --test-project-only \
  --apply \
  --yes
```

Expected: domain moves only between test projects.

## Execution Order

1. Workstream A: test split, exit codes, schema versions.
2. Workstream B: config file, policy checks, audit history.
3. Workstream C1: add live smoke script and docs.
4. Workstream C2: run read-only live validation after user approval.
5. Workstream C3: run write validation only after explicit user approval for `vcopy-test-*` resources.

## Self-Review

- The plan separates code-only work from live testing.
- Every live command is opt-in and constrained to `vcopy-test-*`.
- Destructive operations are never part of `npm test`.
- The next implementation should start with TDD and commit after each task.
