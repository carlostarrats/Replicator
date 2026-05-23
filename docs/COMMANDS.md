# Vercel Config Manager Command Reference

All commands are designed to avoid secret value exposure. Commands marked `test-write` require explicit apply flags and are intended for `vcopy-test-*` projects or local test files.

## vcopy analyze

Permission: read-only

Purpose: Analyze a Vercel project and export safe config metadata.

Example:

```bash
node src/cli.mjs analyze brand-a-web --out ./analysis.md
```

Writes: report file only.

## vcopy audit-save

Permission: local-only

Purpose: Store a timestamped local copy of a report for audit history.

Example:

```bash
node src/cli.mjs audit-save --report ./ci.json --out-dir ./.vcopy/audit
```

Writes: local audit copy only.

## vcopy check

Permission: read-only

Purpose: Check deployment readiness from safe project metadata.

Example:

```bash
node src/cli.mjs check brand-b-web --fail-on-blocked
```

Writes: stdout or report file only.

## vcopy ci

Permission: read-only

Purpose: Run readiness and drift checks for automation.

Example:

```bash
node src/cli.mjs ci --from brand-a-web --to brand-b-web
```

Writes: stdout or report file only.

## vcopy diff

Permission: read-only

Purpose: Compare two project configuration snapshots.

Example:

```bash
node src/cli.mjs diff brand-a-web brand-b-web --fail-on-drift
```

Writes: stdout or report file only.

## vcopy domain-move

Permission: test-write

Purpose: Move a test domain between test-scoped projects.

Example:

```bash
node src/cli.mjs domain-move --from vcopy-test-source --to vcopy-test-target --domain vcopy-test.example.com --test-project-only --apply --yes
```

Writes: fake API or test-scoped Vercel domain changes only.

## vcopy duplicate

Permission: test-write

Purpose: Preview or create a project copy with safe build settings.

Example:

```bash
node src/cli.mjs duplicate --from brand-a-web --to vcopy-test-brand-b --dry-run
```

Writes: project creation only when `--apply --yes` is used.

## vcopy env-push

Permission: test-write

Purpose: Push selected local env values to test-scoped projects after review.

Example:

```bash
node src/cli.mjs env-push vcopy-test-target --env-file ./.env --keys DATABASE_URL --target preview --dry-run
```

Writes: selected env values only when `--apply --yes` is used.

## vcopy env-rm

Permission: test-write

Purpose: Remove selected env entries from test-scoped projects after review.

Example:

```bash
node src/cli.mjs env-rm vcopy-test-target --key DATABASE_URL --target preview --dry-run
```

Writes: selected env removals only when `--apply --yes` is used.

## vcopy env-template

Permission: read-only

Purpose: Export environment variable names without secret values.

Example:

```bash
node src/cli.mjs env-template brand-a-web --out ./.env.example
```

Writes: local template file only.

## vcopy handoff-package

Permission: local-only

Purpose: Build a local handoff folder with a report, checklist, README, and viewer.

Example:

```bash
node src/cli.mjs handoff-package --report ./analysis.json --out-dir ./handoff
```

Writes: local handoff files only.

## vcopy integration-plan

Permission: read-only

Purpose: Print manual integration migration steps without copying credentials.

Example:

```bash
node src/cli.mjs integration-plan --from brand-a-web --to brand-b-web
```

Writes: stdout or report file only.

## vcopy overview

Permission: read-only

Purpose: Summarize related projects and variant drift.

Example:

```bash
node src/cli.mjs overview --projects brand-a-web,brand-b-web
```

Writes: stdout or report file only.

## vcopy policy-check

Permission: local-only

Purpose: Evaluate a local JSON report against a local policy file.

Example:

```bash
node src/cli.mjs policy-check --report ./analysis.json --policy ./policy.json
```

Writes: stdout only.

## vcopy projects

Permission: read-only

Purpose: List available Vercel projects.

Example:

```bash
node src/cli.mjs projects
```

Writes: stdout or report file only.

## vcopy protection-sync

Permission: test-write

Purpose: Sync deployment protection settings between test-scoped projects.

Example:

```bash
node src/cli.mjs protection-sync --from vcopy-test-source --to vcopy-test-target --test-project-only --apply --yes
```

Writes: test-scoped project settings only.

## vcopy refactor-env

Permission: read-only

Purpose: Recommend shared and project-specific environment variables.

Example:

```bash
node src/cli.mjs refactor-env --projects brand-a-web,brand-b-web
```

Writes: stdout or report file only.

## vcopy report

Permission: read-only

Purpose: Generate a migration handoff report combining analysis, readiness, duplicate plan, and drift.

Example:

```bash
node src/cli.mjs report --from brand-a-web --to brand-b-web --out ./migration.md
```

Writes: report file only.

## vcopy routing-sync

Permission: test-write

Purpose: Sync cron and rewrite settings between local `vercel.json` test files.

Example:

```bash
node src/cli.mjs routing-sync --from-config ./source-vercel.json --to-config ./target-vercel.json --dry-run
```

Writes: local target config file only when `--apply --yes` is used.

## vcopy secrets-migrate

Permission: test-write

Purpose: Migrate selected local env values to a test-scoped target.

Example:

```bash
node src/cli.mjs secrets-migrate --from vcopy-test-source --to vcopy-test-target --env-file ./.env --keys DATABASE_URL --target preview --dry-run
```

Writes: selected env values only when `--apply --yes` is used.

## vcopy snapshot-diff

Permission: local-only

Purpose: Compare two local analysis JSON reports without Vercel calls.

Example:

```bash
node src/cli.mjs snapshot-diff --left ./before.json --right ./after.json
```

Writes: stdout only.

## vcopy snapshot-save

Permission: local-only

Purpose: Store a timestamped local copy of a report.

Example:

```bash
node src/cli.mjs snapshot-save --report ./analysis.json --out-dir ./.vcopy/snapshots
```

Writes: local snapshot copy only.

## vcopy teams

Permission: read-only

Purpose: List available Vercel teams.

Example:

```bash
node src/cli.mjs teams
```

Writes: stdout or report file only.

## vcopy template

Permission: read-only

Purpose: Export a reusable project configuration template without secret values.

Example:

```bash
node src/cli.mjs template brand-a-web --out ./template.json
```

Writes: local template file only.

## vcopy template-apply

Permission: test-write

Purpose: Apply a template to a test-scoped project and print env placeholders.

Example:

```bash
node src/cli.mjs template-apply --template ./template.json --to vcopy-test-target --test-project-only --apply --yes
```

Writes: test-scoped project creation only.

## vcopy template-plan

Permission: local-only

Purpose: Preview a local template application plan without Vercel calls.

Example:

```bash
node src/cli.mjs template-plan --template ./template.json --to brand-c-web
```

Writes: stdout or report file only.

## vcopy verify

Permission: read-only

Purpose: Classify latest deployment logs into actionable config fixes.

Example:

```bash
node src/cli.mjs verify brand-b-web
```

Writes: stdout or report file only.

## vcopy viewer

Permission: local-only

Purpose: Generate a local static viewer for JSON reports.

Example:

```bash
node src/cli.mjs viewer --out ./vcopy-viewer.html
```

Writes: local HTML file only.
