# Examples

Analyze a project and write a Markdown report:

```bash
node src/cli.mjs analyze vcopy-smoke-test --code-root vercel-smoke-test --out ./analysis.md
```

Use shared local defaults:

```bash
node src/cli.mjs analyze brand-a-web --config ./.vcopyrc.json
node src/cli.mjs projects --config ./.vcopyrc.json
```

Analyze a project and write JSON:

```bash
node src/cli.mjs analyze vcopy-smoke-test --format json --out ./analysis.json
```

Run local policy checks against a JSON report:

```bash
node src/cli.mjs policy-check --report ./analysis.json --policy ./policy.json
```

Save and compare local report snapshots:

```bash
node src/cli.mjs snapshot-save --report ./analysis.json --out-dir ./.vcopy/snapshots
node src/cli.mjs snapshot-diff --left ./.vcopy/snapshots/before.json --right ./.vcopy/snapshots/after.json
```

Save an audit-history copy:

```bash
node src/cli.mjs audit-save --report ./ci.json --out-dir ./.vcopy/audit
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

Preview guarded destructive workflows:

```bash
node src/cli.mjs integration-plan --from brand-a-web --to brand-b-web --dry-run
node src/cli.mjs protection-sync --from vcopy-test-source --to vcopy-test-target --dry-run
node src/cli.mjs domain-move --from vcopy-test-source --to vcopy-test-target --domain vcopy-test.example.com --dry-run
node src/cli.mjs routing-sync --from-config ./source-vercel.json --to-config ./target-vercel.json --dry-run
node src/cli.mjs secrets-migrate --from vcopy-test-source --to vcopy-test-target --env-file ./.env --keys DATABASE_URL --target preview --dry-run
```

Apply guarded destructive workflows only to test projects or test files:

```bash
node src/cli.mjs protection-sync --from vcopy-test-source --to vcopy-test-target --test-project-only --apply --yes
node src/cli.mjs domain-move --from vcopy-test-source --to vcopy-test-target --domain vcopy-test.example.com --test-project-only --apply --yes
node src/cli.mjs routing-sync --from-config ./source-vercel.json --to-config ./target-vercel.json --test-project-only --apply --yes
node src/cli.mjs secrets-migrate --from vcopy-test-source --to vcopy-test-target --env-file ./.env --keys DATABASE_URL --target preview --test-project-only --apply --yes
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

Export a reusable project config template:

```bash
node src/cli.mjs template brand-a-web --out ./brand-a-template.json
```

Preview a local plan from that template:

```bash
node src/cli.mjs template-plan --template ./brand-a-template.json --to brand-c-web
```

Create a local JSON report viewer:

```bash
node src/cli.mjs viewer --out ./vcopy-viewer.html
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
