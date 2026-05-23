# Examples

Analyze a project and write a Markdown report:

```bash
node src/cli.mjs analyze vcopy-smoke-test --code-root vercel-smoke-test --out ./analysis.md
```

Analyze a project and write JSON:

```bash
node src/cli.mjs analyze vcopy-smoke-test --format json --out ./analysis.json
```

Preview a duplicate operation:

```bash
node src/cli.mjs duplicate --from vcopy-smoke-test --to vcopy-smoke-test-copy --dry-run
```

Create a duplicate project after reviewing the dry run:

```bash
node src/cli.mjs duplicate --from vcopy-smoke-test --to vcopy-smoke-test-copy --apply --yes
```

Check readiness:

```bash
node src/cli.mjs check vcopy-smoke-test
```

Run the CI gate:

```bash
node src/cli.mjs ci --from vcopy-smoke-test --to vcopy-smoke-test-copy --out ./vercel-config-ci.md
```

Verify the latest deployment:

```bash
node src/cli.mjs verify vcopy-smoke-test
```

Compare projects:

```bash
node src/cli.mjs diff brand-a-web brand-b-web
```

Fail automation when drift is detected:

```bash
node src/cli.mjs diff brand-a-web brand-b-web --fail-on-drift
```

Create a migration handoff report:

```bash
node src/cli.mjs report --from brand-a-web --to brand-b-web --code-root ./apps/web --out ./migration.md
```

Create a team-level overview:

```bash
node src/cli.mjs overview
node src/cli.mjs overview --projects brand-a-web,brand-b-web --format json --out ./overview.json
node src/cli.mjs overview --projects brand-a-web,brand-b-web --fail-on-drift
```

Export env names without values:

```bash
node src/cli.mjs env-template brand-a-web --out ./.env.example
```

Push a selected local env value:

```bash
node src/cli.mjs env-push brand-b-web --env-file ./.env --keys DATABASE_URL --target preview --dry-run
node src/cli.mjs env-push brand-b-web --env-file ./.env --keys DATABASE_URL --target preview --apply --yes
```

Remove a selected env value:

```bash
node src/cli.mjs env-rm brand-b-web --key DATABASE_URL --target preview --dry-run
node src/cli.mjs env-rm brand-b-web --key DATABASE_URL --target preview --apply --yes
```
