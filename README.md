# Vercel Config Manager

A small, non-mutating CLI for analyzing Vercel project configuration and exporting a safe Markdown report.

Implemented commands:

```bash
vcopy analyze
vcopy duplicate --from <source-project> --to <new-project> --dry-run
vcopy duplicate --from <source-project> --to <new-project> --apply --yes
vcopy check <project>
vcopy ci --from <source-project> --to <target-project>
vcopy diff <project-a> <project-b>
vcopy verify <project>
vcopy refactor-env
vcopy teams
vcopy projects
vcopy env-template <project>
vcopy env-push <project>
vcopy env-rm <project>
vcopy report --from <source-project> --to <target-project>
vcopy overview
```

The CLI reads project metadata and environment variable names/scopes only. It does not read or copy secret contents, transfer domains, or migrate integration credentials.

Authentication uses `VERCEL_TOKEN` when provided. If it is absent, the CLI will try the local Vercel CLI auth file created by `vercel login`.

`duplicate --apply --yes` creates the new Vercel project and copies safe build settings. It does not create environment variables with fake values; instead it prints the exact `vercel env add` checklist for manual secret entry.

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
```

Export an env template without secret values:

```bash
node src/cli.mjs env-template brand-a-web --out ./.env.example
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
