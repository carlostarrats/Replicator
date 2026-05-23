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

Verify the latest deployment:

```bash
node src/cli.mjs verify vcopy-smoke-test
```

Compare projects:

```bash
node src/cli.mjs diff brand-a-web brand-b-web
```

Export env names without values:

```bash
node src/cli.mjs env-template brand-a-web --out ./.env.example
```
