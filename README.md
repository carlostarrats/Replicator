# Vercel Config Manager

A CLI for analyzing, duplicating, validating, and safely testing Vercel project configuration workflows.

Implemented commands:

```bash
vcopy analyze
vcopy audit-save --report <report.json> --out-dir <directory>
vcopy duplicate --from <source-project> --to <new-project> --dry-run
vcopy duplicate --from <source-project> --to <new-project> --apply --yes
vcopy check <project>
vcopy ci --from <source-project> --to <target-project>
vcopy diff <project-a> <project-b>
vcopy domain-move --from <source-project> --to <target-project> --domain <domain>
vcopy verify <project>
vcopy integration-plan --from <source-project> --to <target-project>
vcopy protection-sync --from <source-project> --to <target-project>
vcopy refactor-env
vcopy routing-sync --from-config <source-vercel.json> --to-config <target-vercel.json>
vcopy secrets-migrate --from <source-project> --to <target-project>
vcopy snapshot-save --report <report.json> --out-dir <directory>
vcopy snapshot-diff --left <left.json> --right <right.json>
vcopy teams
vcopy projects
vcopy env-template <project>
vcopy env-push <project>
vcopy env-rm <project>
vcopy handoff-package --report <report.json> --out-dir <directory>
vcopy report --from <source-project> --to <target-project>
vcopy overview
vcopy policy-check --report <analysis.json> --policy <policy.json>
vcopy template <project>
vcopy template-apply --template <template.json> --to <target-project>
vcopy template-plan --template <template.json> --to <target-project>
vcopy viewer [--out ./vcopy-viewer.html]
```

See `docs/COMMANDS.md` for the full command reference.
See `docs/INSTALL.md` for local install and development setup.
See `docs/START_HERE.md` for the safe first-run workflow.

The CLI reads project metadata and environment variable names/scopes only. It does not read or copy secret contents, transfer domains, or migrate integration credentials.

Destructive writes are test-scoped. Commands that mutate domains, deployment protection, routing config, or selected local secret values require `--test-project-only --apply --yes` and refuse non-`vcopy-test-*` projects.

Authentication uses `VERCEL_TOKEN` when provided. If it is absent, the CLI will try the local Vercel CLI auth file created by `vercel login`.

`duplicate --apply --yes` creates the new Vercel project and copies safe build settings. It does not create environment variables with fake values; instead it prints the exact `vercel env add` checklist for manual secret entry.

`policy-check` is local-only. It evaluates a JSON report against a local policy file and exits `4` when the policy fails.

## Config File

Pass `--config ./.vcopyrc.json` to load shared defaults:

```json
{
  "teamId": "team_123",
  "testProjectPrefix": "vcopy-test-",
  "defaultOutDir": "./vcopy-reports"
}
```

CLI flags and environment variables override config values. `testProjectPrefix` controls the allowed project-name prefix for guarded destructive writes. `defaultOutDir` is used for the default `analyze` report path when `--out` is not provided.

## Output Controls

Use `--quiet` to suppress informational stdout. Use `--verbose` to print diagnostic details such as the command permission category to stderr.

## Usage

Run through Node directly:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs analyze
```

Analyze a specific project:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs analyze brand-a-web
```

Preview a duplicate operation:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs duplicate --from brand-a-web --to brand-b-web --dry-run
```

Include local `vercel.json` review items in the duplicate plan:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs duplicate --from brand-a-web --to brand-b-web --code-root /path/to/repo --dry-run
```

Create the project after reviewing the dry-run output:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs duplicate --from brand-a-web --to brand-b-web --apply --yes
```

Check readiness:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs check brand-b-web
```

Include local source-code env checks:

```bash
node src/cli.mjs check brand-b-web --code-root /path/to/repo
```

Fail CI when readiness has blockers:

```bash
node src/cli.mjs check brand-b-web --fail-on-blocked
```

Run the combined CI gate for target readiness and source/target drift:

```bash
node src/cli.mjs ci --from brand-a-web --to brand-b-web
node src/cli.mjs ci --from brand-a-web --to brand-b-web --out ./vercel-config-ci.md
```

Write a readiness report:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs check brand-b-web --out ./readiness.md
```

Write JSON for automation:

```bash
node src/cli.mjs analyze brand-a-web --format json --out ./analysis.json
node src/cli.mjs check brand-b-web --format json --out ./readiness.json
node src/cli.mjs diff brand-a-web brand-b-web --format json --out ./diff.json
node src/cli.mjs verify brand-b-web --format json --out ./verify.json
node src/cli.mjs duplicate --from brand-a-web --to brand-b-web --dry-run --format json --out ./duplicate-plan.json
```

Compare projects:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs diff brand-a-web brand-b-web
```

Fail CI when project drift is detected:

```bash
node src/cli.mjs diff brand-a-web brand-b-web --fail-on-drift
```

Create a combined migration handoff report:

```bash
node src/cli.mjs report --from brand-a-web --to brand-b-web --code-root /path/to/repo --out ./migration.md
```

Preview destructive workflows before any test-scoped apply:

```bash
node src/cli.mjs integration-plan --from brand-a-web --to brand-b-web --dry-run
node src/cli.mjs protection-sync --from vcopy-test-source --to vcopy-test-target --dry-run
node src/cli.mjs domain-move --from vcopy-test-source --to vcopy-test-target --domain vcopy-test.example.com --dry-run
node src/cli.mjs routing-sync --from-config ./source-vercel.json --to-config ./target-vercel.json --dry-run
node src/cli.mjs secrets-migrate --from vcopy-test-source --to vcopy-test-target --env-file ./.env --keys DATABASE_URL --target preview --dry-run
```

Apply destructive workflows only to `vcopy-test-*` projects or local test files:

```bash
node src/cli.mjs protection-sync --from vcopy-test-source --to vcopy-test-target --test-project-only --apply --yes
node src/cli.mjs domain-move --from vcopy-test-source --to vcopy-test-target --domain vcopy-test.example.com --test-project-only --apply --yes
node src/cli.mjs routing-sync --from-config ./source-vercel.json --to-config ./target-vercel.json --test-project-only --apply --yes
node src/cli.mjs secrets-migrate --from vcopy-test-source --to vcopy-test-target --env-file ./.env --keys DATABASE_URL --target preview --test-project-only --apply --yes
```

Inspect the latest deployment and classify common config failures:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs verify brand-b-web
```

Suggest shared env cleanup:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs refactor-env
VERCEL_TOKEN=your_token node src/cli.mjs refactor-env --projects brand-a-web,brand-b-web
```

Create a team-level overview that groups related variants and highlights drift:

```bash
node src/cli.mjs overview
node src/cli.mjs overview --projects brand-a-web,brand-b-web --format json --out ./overview.json
node src/cli.mjs overview --projects brand-a-web,brand-b-web --fail-on-drift
```

The included GitHub Actions workflow `.github/workflows/vercel-config-audit.yml` runs `overview --fail-on-drift` on a weekly schedule and uploads the Markdown report. Configure `VERCEL_TOKEN` as a repository secret, and optionally set `VERCEL_TEAM_ID` and `VCOPY_AUDIT_PROJECTS` as repository variables.

The PR workflow `.github/workflows/vercel-config-pr.yml` runs `vcopy ci` and comments the report on pull requests when `VCOPY_CI_FROM` and `VCOPY_CI_TO` repository variables are configured.

Export an env template without secret values:

```bash
node src/cli.mjs env-template brand-a-web --out ./.env.example
```

Export a reusable project config template without secret values:

```bash
node src/cli.mjs template brand-a-web --out ./brand-a-template.json
```

Preview a local plan from an exported template without Vercel auth or mutations:

```bash
node src/cli.mjs template-plan --template ./brand-a-template.json --to brand-c-web
```

Apply a template only to a test-scoped target:

```bash
node src/cli.mjs template-apply --template ./brand-a-template.json --to vcopy-test-brand-c --test-project-only --apply --yes
```

This creates the project and prints environment placeholders for manual secret entry. It does not create environment variable values.

Create a local static viewer for exported JSON reports:

```bash
node src/cli.mjs viewer --out ./vcopy-viewer.html
```

Push selected values from a local `.env` after an explicit dry run:

```bash
node src/cli.mjs env-push brand-b-web --env-file ./.env --keys DATABASE_URL --target preview --dry-run
node src/cli.mjs env-push brand-b-web --env-file ./.env --keys DATABASE_URL --target preview --apply --yes
```

Remove selected env values with the same dry-run/apply guard:

```bash
node src/cli.mjs env-rm brand-b-web --key DATABASE_URL --target preview --dry-run
node src/cli.mjs env-rm brand-b-web --key DATABASE_URL --target preview --apply --yes
```

Choose the report path:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs analyze brand-a-web --out ./vcopy-report.md
```

Scan local source code for `process.env.*` references that are not configured in Vercel:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs analyze brand-a-web --code-root /path/to/repo --out ./vcopy-report.md
```

When `--code-root` contains `vercel.json`, the report also lists cron jobs, rewrites, redirects, and header rules for manual review.

For team-scoped projects:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs analyze brand-a-web --team-id team_xxxxx
```

If `--code-root` points at a Vercel-linked project containing `.vercel/project.json`, the CLI uses that file's `orgId` automatically.

Discover teams and projects:

```bash
node src/cli.mjs teams
node src/cli.mjs projects --team-id team_xxxxx
```

## Tests

```bash
npm test
```

## Exit Codes

- `0`: success
- `1`: usage or runtime error
- `2`: readiness blocker or drift detected
- `3`: unsafe destructive write refused
- `4`: local policy check failed

## Permission Categories

- `read-only`: reads Vercel or local files and writes only reports.
- `local-only`: does not require Vercel auth or Vercel API access.
- `test-write`: can mutate only `vcopy-test-*` projects or local test files and requires explicit apply flags.

## Local Policy Checks

Create a policy file:

```json
{
  "requiredEnvKeys": ["DATABASE_URL", "OPENAI_API_KEY"],
  "forbiddenPublicEnvKeys": ["NEXT_PUBLIC_SECRET_TOKEN"],
  "requiredDomains": ["brand-a.example.com"],
  "requiredProjectSettings": {
    "framework": "nextjs",
    "rootDirectory": "apps/web"
  },
  "forbiddenProjectSettings": {
    "autoExposeSystemEnvs": true
  },
  "forbiddenEnvTargets": [
    { "key": "DATABASE_URL", "targets": ["development"] }
  ]
}
```

Run it against a local JSON report:

```bash
node src/cli.mjs analyze brand-a-web --format json --out ./analysis.json
node src/cli.mjs policy-check --report ./analysis.json --policy ./policy.json
```

## Local Snapshots

Save report copies without calling Vercel:

```bash
node src/cli.mjs snapshot-save --report ./analysis.json --out-dir ./.vcopy/snapshots
```

Compare two saved analysis reports locally:

```bash
node src/cli.mjs snapshot-diff --left ./.vcopy/snapshots/a.json --right ./.vcopy/snapshots/b.json
```

Store audit-history copies of generated reports:

```bash
node src/cli.mjs audit-save --report ./ci.json --out-dir ./.vcopy/audit
```

Create a local handoff package:

```bash
node src/cli.mjs handoff-package --report ./analysis.json --out-dir ./handoff
```
