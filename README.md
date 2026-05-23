# Vercel Config Manager

Vercel Config Manager (`vcopy`) is a Node.js CLI for inspecting, comparing, documenting, and safely preparing Vercel project configuration changes.

It is built for teams that manage multiple related Vercel projects and need a repeatable way to answer questions like:

- What build settings, domains, env names, and deployment protection settings does this project use?
- Is a target project ready to deploy?
- What drift exists between two project variants?
- Which secret values need manual entry without exposing them in reports?
- Can we generate a local handoff package for a migration or review?

The CLI reads project metadata and environment variable names/scopes. It does not read or print secret values, and real project mutation is disabled by default.

## Overview

`vcopy` combines Vercel API reads, local source/config scanning, JSON/Markdown reports, local policy checks, and guarded write workflows. It can be used interactively during a migration or in CI to detect readiness blockers and configuration drift.

Key outputs include:

- analysis reports for a single project
- readiness checks for a target project
- diffs between two projects
- CI reports with automation-friendly exit codes
- local policy results
- reusable project templates without secret values
- local snapshot/audit history files
- handoff packages with reports, checklists, and a local HTML viewer

## What it does

- Analyzes Vercel project settings, domains, env names/scopes, likely services, and optional local `vercel.json` routing/cron settings.
- Compares two projects for build setting, env scope, and domain drift.
- Checks deployment readiness and can fail automation on blockers.
- Verifies latest deployment logs and classifies common config errors.
- Exports local JSON reports with schema/version metadata.
- Generates reusable project templates and local template apply plans.
- Evaluates local policy files for required env keys, forbidden public keys, required domains, required project settings, forbidden project settings, and blocked env targets.
- Stores local snapshots and audit-history report copies.
- Generates local handoff packages and a static report viewer.
- Provides guarded write commands for test-scoped targets and local fixture files.

## Safety model

The project is intentionally conservative:

- Secret values are not read from Vercel or printed in reports.
- Env-related reports include names, scopes, and types only.
- Integration credentials are not copied.
- Domain and project mutation commands require explicit apply flags.
- Guarded write commands require `--test-project-only --apply --yes`.
- Guarded project writes refuse targets that do not start with `vcopy-test-` unless the local config changes the test prefix.
- Real project mutation is disabled by default; see `docs/REAL_PROJECT_POLICY.md`.

The local dogfood workflow uses a local Vercel API simulator so contributors can exercise the full flow without touching real Vercel projects.

## Install

```bash
npm install
node src/cli.mjs --version
node src/cli.mjs --help
```

Optional local link:

```bash
npm link
vcopy --help
```

## Quick start

Run the safe local workflow:

```bash
npm run dogfood -- --out-dir ./.vcopy/dogfood
```

This writes local reports, a policy result, a snapshot, a CI report, a template, a template plan, a handoff package, and a local viewer. It uses local simulated Vercel API responses and does not call real Vercel projects.

For a real read-only project analysis:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs analyze brand-a-web --format json --out ./analysis.json
```

See `docs/START_HERE.md` for a first-run walkthrough.

## Common commands

Analyze a project:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs analyze brand-a-web --out ./analysis.md
```

Include local source and `vercel.json` checks:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs analyze brand-a-web --code-root /path/to/repo --out ./analysis.md
```

Check target readiness:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs check brand-b-web --fail-on-blocked
```

Compare two projects:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs diff brand-a-web brand-b-web --fail-on-drift
```

Run the combined CI gate:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs ci --from brand-a-web --to brand-b-web --out ./vercel-config-ci.md
```

Create a migration handoff report:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs report --from brand-a-web --to brand-b-web --code-root /path/to/repo --out ./migration.md
```

Export a template without secret values:

```bash
VERCEL_TOKEN=your_token node src/cli.mjs template brand-a-web --out ./brand-a-template.json
```

Preview a template locally:

```bash
node src/cli.mjs template-plan --template ./brand-a-template.json --to brand-c-web
```

Generate a local handoff package:

```bash
node src/cli.mjs handoff-package --report ./analysis.json --out-dir ./handoff
```

Create a local report viewer:

```bash
node src/cli.mjs viewer --out ./vcopy-viewer.html
```

## Command reference

Implemented commands:

```bash
vcopy analyze
vcopy audit-save --report <report.json> --out-dir <directory>
vcopy check <project>
vcopy ci --from <source-project> --to <target-project>
vcopy diff <project-a> <project-b>
vcopy domain-move --from <source-project> --to <target-project> --domain <domain>
vcopy duplicate --from <source-project> --to <new-project> --dry-run
vcopy env-push <project>
vcopy env-rm <project>
vcopy env-template <project>
vcopy handoff-package --report <report.json> --out-dir <directory>
vcopy integration-plan --from <source-project> --to <target-project>
vcopy overview
vcopy policy-check --report <analysis.json> --policy <policy.json>
vcopy projects
vcopy protection-sync --from <source-project> --to <target-project>
vcopy refactor-env
vcopy report --from <source-project> --to <target-project>
vcopy routing-sync --from-config <source-vercel.json> --to-config <target-vercel.json>
vcopy secrets-migrate --from <source-project> --to <target-project>
vcopy snapshot-diff --left <left.json> --right <right.json>
vcopy snapshot-save --report <report.json> --out-dir <directory>
vcopy teams
vcopy template <project>
vcopy template-apply --template <template.json> --to <target-project>
vcopy template-plan --template <template.json> --to <target-project>
vcopy verify <project>
vcopy viewer
```

See `docs/COMMANDS.md` for detailed command behavior, permissions, examples, and write scope.

## Configuration

Pass `--config ./.vcopyrc.json` to load shared defaults:

```json
{
  "teamId": "team_123",
  "testProjectPrefix": "vcopy-test-",
  "defaultOutDir": "./vcopy-reports"
}
```

CLI flags and environment variables override config values.

## Local policy checks

Example policy:

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
node src/cli.mjs policy-check --report ./analysis.json --policy ./policy.json
```

## GitHub Actions

This repository includes optional workflows:

- `.github/workflows/vercel-config-audit.yml`: scheduled/manual overview drift report.
- `.github/workflows/vercel-config-pr.yml`: pull request config check when `VCOPY_CI_FROM` and `VCOPY_CI_TO` repository variables are configured.

Configure `VERCEL_TOKEN` as a repository secret before enabling workflows that read real Vercel projects.

## Tests

```bash
npm test
```

The test suite uses local files and a local Vercel API simulator. It does not require real Vercel projects.

## Exit codes

- `0`: success
- `1`: usage or runtime error
- `2`: readiness blocker or drift detected
- `3`: unsafe destructive write refused
- `4`: local policy check failed

## Permission categories

- `read-only`: reads Vercel or local files and writes only reports.
- `local-only`: does not require Vercel auth or Vercel API access.
- `test-write`: can mutate only test-scoped projects or local test files and requires explicit apply flags.

## Documentation

- `docs/START_HERE.md`: safe first-run workflow.
- `docs/COMMANDS.md`: full command reference.
- `docs/INSTALL.md`: install and development setup.
- `docs/SECURITY.md`: security model.
- `docs/SECURITY_REVIEW.md`: release safety checklist.
- `docs/REAL_PROJECT_POLICY.md`: real-project mutation policy.
- `docs/RELEASE.md`: release checklist.

## License

MIT. See `LICENSE`.
