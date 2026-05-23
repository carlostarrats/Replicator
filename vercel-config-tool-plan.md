# Vercel Config Tool Plan

## Working Name

**Vercel Config Manager**

A focused tool for duplicating, validating, and cleaning up Vercel project configurations, especially for teams using monorepos with multiple project variants.

---

## Core Idea

Vercel projects are easy to create, but painful to duplicate safely.

The tool should help a user:

1. Analyze an existing Vercel project
2. Duplicate the safe parts of its configuration
3. Avoid handling secret values directly
4. Tell the user exactly what still needs to be entered
5. Validate the new project after setup
6. Detect config drift across related projects
7. Suggest cleanup, shared env vars, and refactors

The product should feel calm, explicit, and step-by-step.

The user should always know:

- what was copied
- what was skipped
- what is missing
- where to enter missing values
- what failed
- how to fix it

---

## Product Positioning

### Simple Version

Duplicate, compare, and clean up Vercel project configs without touching secrets.

### More Product-Like Version

A configuration management layer for Vercel projects and monorepo variants.

### What It Is Not

This should not become a universal cloud infrastructure platform.

Keep the initial scope tight:

- Vercel only
- project duplication
- env vars
- project settings
- config diffing
- readiness checks
- shared env cleanup
- deployment verification

---

## Main User Problem

A user has an existing Vercel project and wants to create a new project that is mostly the same.

This is common when:

- using a monorepo
- deploying multiple variants of the same app
- creating white-label versions
- splitting staging/production patterns
- handing off a project
- moving a project between teams
- creating a new customer-specific deployment

The pain is not just creating the project.

The pain is remembering everything that matters:

- framework settings
- build command
- output directory
- root directory
- install command
- env var names
- env var scopes
- production/preview/development values
- domains
- deployment protection
- cron jobs
- integrations
- storage connections
- redirects/rewrites
- repo settings
- team settings

Most failures happen because one invisible setting was missed.

---

## Security Principle

The tool should not read, store, transmit, or proxy secret values.

It should work with:

- env var names
- scopes
- target environments
- metadata
- missing/present status
- code references to env vars
- Vercel project configuration

It should not handle:

- decrypted API keys
- database passwords
- tokens
- private secret values

If a value is needed, the user should enter it directly into Vercel or their terminal.

The tool can guide them, but should not own the secret.

---

## Core Flow

## Step 1 — Connect / Select Source Project

The user connects Vercel or provides access through the Vercel CLI/API.

The tool lists available teams and projects.

The user selects a source project.

Output:

```txt
Source project selected:
- Team: Acme
- Project: brand-a-web
- Framework: Next.js
- Repo: acme/app-monorepo
- Root directory: apps/web
```

---

## Step 2 — Analyze Source Project

The tool reads safe configuration data.

It should detect:

- framework preset
- build command
- install command
- output directory
- root directory
- node version if available
- env var names
- env var environment scopes
- Vercel project settings
- domains
- cron jobs
- deployment protection settings
- git repository connection
- likely integrations
- storage dependencies
- env vars referenced in source code

Output:

```txt
Detected configuration

Framework:
- Next.js

Build settings:
- Root directory: apps/web
- Install command: pnpm install
- Build command: pnpm build
- Output directory: .next

Environment variables:
- DATABASE_URL — Production, Preview
- OPENAI_API_KEY — Production, Preview
- NEXT_PUBLIC_APP_URL — Production, Preview, Development
- BLOB_READ_WRITE_TOKEN — Production

Possible services:
- Vercel Blob
- Upstash Redis
- OpenAI
- Postgres
```

---

## Step 3 — Create Duplicate Project

The user gives the new project a name.

The tool creates a new Vercel project and copies safe settings.

It should copy:

- project name or generated name
- framework preset
- root directory
- build command
- install command
- output directory
- development command if available
- public env vars if safe and explicitly allowed
- env var names as placeholders
- target environment scopes
- selected project settings

It should not automatically copy:

- domains
- production secret values
- encrypted/decrypted env values
- billing settings
- marketplace integration credentials
- anything destructive

Output:

```txt
Duplicate created

Copied:
- Framework preset
- Root directory
- Build command
- Install command
- Output directory
- Environment variable names

Skipped:
- Secret values
- Domains
- Integration credentials
- Deployment protection bypass secrets
```

---

## Step 4 — Missing Values Checklist

The tool generates a clear list of what still needs to be entered.

For each missing item, show:

- name
- environment
- whether required or optional
- where to enter it in Vercel UI
- terminal command option
- what it likely does
- whether it appears in the source code

Example:

```txt
Missing required values

DATABASE_URL
Used in: apps/web/lib/db.ts
Required for: Production, Preview
Where: Vercel → Project → Settings → Environment Variables
CLI:
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview

OPENAI_API_KEY
Used in: apps/web/lib/ai.ts
Required for: Production, Preview
Where: Vercel → Project → Settings → Environment Variables
CLI:
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_API_KEY preview
```

---

## Step 5 — Guided Fixes

The product should offer clear instructions for every missing or risky item.

Each issue should include:

- what is wrong
- why it matters
- how to fix it in Vercel
- how to fix it in terminal
- what to check after fixing

Example:

```txt
Issue: NEXT_PUBLIC_APP_URL points to the old project domain

Why it matters:
The app may generate links back to the original deployment.

Fix in Vercel:
Project → Settings → Environment Variables → NEXT_PUBLIC_APP_URL

Fix in terminal:
vercel env rm NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_APP_URL production

Suggested value:
https://new-project.vercel.app
```

---

## Step 6 — Readiness Check

The tool should calculate a readiness status before deployment.

Example:

```txt
Deployment readiness: 72%

Ready:
- Project created
- Build settings copied
- Env var names created
- Git repo connected

Needs attention:
- 3 required env values missing
- 1 public URL points to old domain
- Blob store not connected

Blocked:
- DATABASE_URL missing for Preview
```

Readiness should be practical, not decorative.

It should tell the user whether they can deploy successfully.

---

## Step 7 — Test Deploy / Verify

After the user fills missing values, the tool can trigger or inspect a deployment.

It should:

- start a preview deploy if allowed
- read deployment logs
- classify errors
- connect errors back to config issues
- suggest fixes

Example:

```txt
Preview deployment failed

Detected issue:
Prisma could not connect to the database.

Likely cause:
DATABASE_URL is missing or invalid in the Preview environment.

Fix:
Add or update DATABASE_URL for Preview.

Vercel UI:
Project → Settings → Environment Variables → Preview

CLI:
vercel env add DATABASE_URL preview
```

---

## Step 8 — Compare Projects

The tool should compare two or more Vercel projects.

This is useful for monorepos and variants.

Example:

```txt
Comparing brand-a-web and brand-b-web

Same:
- Framework: Next.js
- Root directory: apps/web
- Build command: pnpm build
- OPENAI_API_KEY exists in Production
- SENTRY_DSN exists in Production and Preview

Different:
- NEXT_PUBLIC_BRAND
- NEXT_PUBLIC_APP_URL
- DATABASE_URL

Missing from brand-b-web:
- BLOB_READ_WRITE_TOKEN
- CRON_SECRET

Possible drift:
- NODE_VERSION differs
- Preview env has 2 fewer variables than Production
```

---

## Step 9 — Refactor / Shared Env Suggestions

The tool should detect duplicated env vars across projects and suggest cleanup.

The user in the tweet specifically mentioned support for refactoring or “demoting” env vars into shared env vars.

The tool should identify:

- env vars repeated across many projects
- env vars that likely should be shared
- env vars that likely must stay project-specific
- inconsistent scope usage
- missing values in some environments
- suspicious duplication

Example:

```txt
Shared env recommendations

Good candidates for shared env vars:
- OPENAI_API_KEY — used by 6 projects
- SENTRY_AUTH_TOKEN — used by 6 projects
- STRIPE_SECRET_KEY — used by 4 projects

Should remain project-specific:
- DATABASE_URL — differs by project
- NEXT_PUBLIC_APP_URL — differs by domain
- NEXT_PUBLIC_BRAND — differs by variant

Cleanup opportunity:
Moving 5 env vars to shared config could remove 24 duplicated entries.
```

The tool should not auto-refactor without user approval.

---

## UX Principle

The interface should be step-based.

The tone should feel like:

> “Here is what I found. Here is what I copied. Here is what I skipped. Here is what you need to do next.”

Avoid magic.

Avoid destructive automation.

Avoid hiding important details.

---

## Suggested Screens / CLI States

## 1. Source Project

Select the project to duplicate.

## 2. Project Analysis

Show detected stack, settings, env vars, integrations, and risks.

## 3. Duplicate Setup

Let the user choose:

- new project name
- team
- repo connection
- whether to copy domains
- whether to create env placeholders
- whether to copy public env values

## 4. Copy Plan

Before making changes, show a dry-run plan.

```txt
This will:
- Create project brand-c-web
- Copy build settings
- Copy 18 env var names
- Create placeholders for Production and Preview

This will not:
- Copy secret values
- Move domains
- Modify the source project
- Delete anything
```

## 5. Missing Values

Show a checklist of manual actions.

## 6. Verification

Run checks and show status.

## 7. Project Diff

Compare source and duplicate.

## 8. Cleanup Suggestions

Suggest shared env vars and config refactors.

---

## CLI Concept

Initial commands could look like:

```bash
vcopy analyze
vcopy duplicate
vcopy check
vcopy diff
vcopy refactor-env
```

Example:

```bash
vcopy analyze acme/brand-a-web
```

```bash
vcopy duplicate acme/brand-a-web --to brand-b-web --no-secrets
```

```bash
vcopy check brand-b-web
```

```bash
vcopy diff brand-a-web brand-b-web
```

```bash
vcopy refactor-env --team acme
```

---

## MVP Scope

The first version should be small and useful.

### MVP Should Include

- Vercel authentication
- list teams/projects
- select source project
- read project settings
- read env var names/scopes without exposing values
- create duplicate project
- copy basic build settings
- create env var placeholder checklist
- generate CLI instructions for missing env vars
- compare source and duplicate
- produce readiness report

### MVP Should Not Include Yet

- automatic secret migration
- full Terraform replacement
- multi-cloud support
- automatic domain transfer
- automatic integration migration
- destructive refactors
- complex UI

---

## V1 Feature Set

After MVP:

- codebase scan for `process.env.*`
- detect missing env vars that are referenced in code but absent in Vercel
- deployment log analysis
- retry/backoff for Vercel API rate limits
- resumable duplication jobs
- dry-run mode
- project diff reports
- exportable migration report

---

## V2 Feature Set

- manage project variants
- group projects by monorepo/app
- detect drift across variants
- suggest shared env vars
- identify redundant env vars
- classify vars as shared vs project-specific
- team-level config overview
- cleanup assistant

---

## V3 Feature Set

- visual config map
- config templates
- safe approved changes
- CI integration
- PR comments for config drift
- scheduled audits
- team onboarding reports
- handoff packages

---

## Important Technical Considerations

## Vercel API Rate Limits

The tool should avoid naive API loops.

It should support:

- batching
- queueing
- exponential backoff
- resumable jobs
- local caching
- progress indicators
- clear rate-limit messages

Example:

```txt
Vercel API rate limit reached.

Progress saved.
Copied 41 of 58 settings.
Retrying in 60 seconds.
You can safely resume this operation later.
```

---

## Secret Handling

The tool should clearly state:

```txt
This tool does not copy secret values.
It only copies names, scopes, and setup instructions.
```

If the user wants to transfer secrets manually, provide commands or Vercel UI paths.

Do not ask users to paste secrets into the product unless absolutely necessary.

---

## Error Handling

No silent failures.

Every failure should explain:

- what failed
- whether anything changed
- whether the source project is safe
- how to retry
- how to fix manually

---

## Possible Tech Stack

Keep it simple.

### CLI

- Node.js
- TypeScript
- Vercel API
- Vercel CLI integration where useful
- local config file
- JSON/Markdown reports

### Optional Web UI Later

- Next.js
- local-first or hosted dashboard
- OAuth with Vercel
- team/project views
- config diffs

Start with CLI first.

The CLI is enough to prove value.

---

## Suggested Repo Structure

```txt
vercel-config-tool/
  README.md
  package.json
  src/
    cli.ts
    commands/
      analyze.ts
      duplicate.ts
      check.ts
      diff.ts
      refactor-env.ts
    vercel/
      client.ts
      projects.ts
      env.ts
      deployments.ts
    analysis/
      scan-code-env.ts
      classify-env.ts
      readiness.ts
      drift.ts
    output/
      markdown.ts
      terminal.ts
    utils/
      rate-limit.ts
      cache.ts
      logger.ts
  docs/
    SECURITY.md
    MVP.md
    EXAMPLES.md
```

---

## Example Output Report

```md
# Vercel Project Duplicate Report

Source project: brand-a-web
New project: brand-b-web

## Copied

- Framework preset
- Build command
- Install command
- Output directory
- Root directory
- Env var names
- Env var scopes

## Skipped

- Secret values
- Domains
- Integration credentials

## Missing Required Values

- DATABASE_URL — Production, Preview
- OPENAI_API_KEY — Production, Preview
- BLOB_READ_WRITE_TOKEN — Production

## Warnings

- NEXT_PUBLIC_APP_URL appears to reference the source project domain
- Preview is missing 2 variables that Production has

## Next Steps

1. Add missing env values in Vercel.
2. Run `vcopy check brand-b-web`.
3. Trigger a preview deployment.
4. Review deployment errors if any.
```

---

## Success Criteria

The MVP is successful if a user can:

1. Select an existing Vercel project
2. Create a duplicate project
3. Understand what was copied
4. Understand what was not copied
5. Fill in missing values safely
6. Run a readiness check
7. Deploy with fewer surprises

The product is successful if users say:

> “This saved me from missing hidden config.”

Not:

> “This magically cloned everything.”

Trust matters more than magic.

---

## First Build Task

Build a CLI that can:

1. Authenticate with Vercel
2. List projects
3. Select a source project
4. Print a safe analysis report
5. List env var names/scopes only
6. Export the report as Markdown

Do not create or modify projects in the first pass.

First command:

```bash
vcopy analyze
```

Expected first useful output:

```txt
Project analyzed successfully.
Report saved to ./vcopy-report.md
```
