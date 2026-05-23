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
- Run scheduled overview audits through GitHub Actions.

## Not Yet Implemented

- Bulk or automatic secret migration.
- Moving domains.
- Migrating integration credentials.
- Full deployment protection policy mutation.
- Cron or rewrite mutation.
- PR comments.
- Web UI.
