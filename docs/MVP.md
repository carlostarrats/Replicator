# MVP Status

## Implemented

- Authenticate with `VERCEL_TOKEN`, `--token`, or local Vercel CLI auth.
- List teams.
- List projects.
- Select or pass a source project.
- Read project settings.
- Read safe deployment protection indicators exposed on the project payload.
- Read env var names and scopes without secret values.
- Read domains.
- Analyze local `process.env.*` references.
- Analyze local `vercel.json` crons and routing rules.
- Detect likely services from env var names.
- Create Markdown and JSON analysis reports.
- Compare two projects.
- Produce readiness reports.
- Inspect latest deployment and classify common env failures.
- Create dry-run duplicate plans.
- Create new duplicate projects with safe build settings.
- Export env templates without values.
- Push explicitly selected local `.env` values to Vercel with dry-run/apply guards.
- Suggest shared env/refactor candidates.
- Generate combined migration handoff reports.
- Run a CI gate that fails on target readiness blockers or source/target drift.
- Run manual, allowlisted overview audits through GitHub Actions.
- Export reusable project config templates without secret values.
- Preview local template application plans without Vercel auth or mutations.
- Comment config CI reports on pull requests through GitHub Actions.
- Generate a local static JSON report viewer.
- Migrate selected local secret values to `vcopy-test-*` projects only.
- Move domains between `vcopy-test-*` projects only.
- Generate integration reconnection plans without copying credentials.
- Sync deployment protection settings to `vcopy-test-*` projects without bypass secrets.
- Sync cron and rewrite config between local test fixture files.

## Destructive Workflow Test Contracts

Destructive workflows start from the fixtures in `test/fixtures/destructive-workflows/`. Those fixtures only use `vcopy-test-*` projects or local test config files, and the contract tests require `--test-project-only --apply --yes` before write behavior can run.
