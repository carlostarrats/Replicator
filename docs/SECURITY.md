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

## Authentication

The CLI uses `VERCEL_TOKEN` or `--token` when provided. If neither is set, it attempts to use the local Vercel CLI auth file created by `vercel login`.

The token is used only in the Authorization header for Vercel API calls and is not written to reports.

Deployment verification reports intentionally omit creator profile metadata from Vercel deployment payloads.
