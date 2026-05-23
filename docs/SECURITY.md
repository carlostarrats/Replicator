# Security Model

Vercel Config Manager is designed to avoid owning secrets.

## What the CLI Reads

- Vercel project metadata
- Build and framework settings
- Environment variable names
- Environment variable scopes and targets
- Domain metadata
- Deployment status and logs
- Sanitized deployment metadata needed for verification reports
- Local `process.env.*` references when `--code-root` is used
- Local `vercel.json` structure when `--code-root` is used

## What the CLI Does Not Read or Store

- Decrypted secret values
- API key contents
- Database passwords
- Deployment protection bypass secrets
- Marketplace integration credentials

## Duplicate Behavior

`duplicate --apply --yes` creates a new project and copies safe build settings. It does not create fake secret values. Instead, it prints the `vercel env add` commands needed for manual entry.

Domains, integration credentials, and destructive changes are skipped by default and listed for manual review.

## Optional Local Env Push

`env-push` is the only command that sends secret values to Vercel. It reads a local `.env` file, requires an explicit `--keys` allowlist, supports `--dry-run`, and refuses to write unless `--apply --yes` is provided.

The command does not print secret values in terminal, Markdown, or JSON output.

`env-rm` refuses to remove one target from an env entry that is scoped to multiple Vercel targets, because deleting by env ID can remove the whole entry. In that case, recreate the variable manually in Vercel with the intended scopes.

## Destructive Test Workflows

Domain moves, selected secret migration, deployment protection sync, and routing mutation are guarded test workflows. They require `--test-project-only --apply --yes`, and project writes are refused unless both source and target project names start with `vcopy-test-`.

`secrets-migrate` reads selected values from a local `.env` file and sends only the explicitly allowlisted keys to Vercel. It does not read decrypted values from Vercel and does not print secret values.

`routing-sync` is local-file based and intended for test fixture config files.

## Authentication

The CLI uses `VERCEL_TOKEN` or `--token` when provided. If neither is set, it attempts to use the local Vercel CLI auth file created by `vercel login`.

The token is used only in the Authorization header for Vercel API calls and is not written to reports.

Deployment verification reports intentionally omit creator profile metadata from Vercel deployment payloads.
