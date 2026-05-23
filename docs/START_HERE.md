# Start Here

This is the safe path for trying Replicator without touching real Vercel projects.

## 1. Install locally

```bash
npm install
node src/cli.mjs --version
```

## 2. Run the local dogfood workflow

```bash
npm run dogfood -- --out-dir ./.vcopy/dogfood
```

The dogfood workflow starts a local Vercel API test server on localhost and writes local artifacts only. It does not call real Vercel projects, domains, or credentials.

Generated artifacts:

- `analysis.json`: safe project metadata and env names/scopes
- `policy.txt`: local policy result
- `snapshots/`: timestamped local report copy
- `ci.md`: readiness and drift report
- `template.json`: reusable project template without secret values
- `template-plan.md`: local apply preview
- `handoff/`: README, checklist, report copy, and viewer
- `viewer.html`: local JSON report viewer

## 3. Review the outputs

Open `./.vcopy/dogfood/handoff/README.md` and `./.vcopy/dogfood/viewer.html`.

Load `analysis.json` into the viewer to inspect the report. The viewer is local-only and never calls Vercel.

## 4. Run focused commands

After the dogfood workflow, try individual commands against the generated local files:

```bash
node src/cli.mjs policy-check --report ./.vcopy/dogfood/analysis.json --policy ./.vcopy/dogfood/policy.json
node src/cli.mjs snapshot-save --report ./.vcopy/dogfood/analysis.json --out-dir ./.vcopy/snapshots
node src/cli.mjs template-plan --template ./.vcopy/dogfood/template.json --to vcopy-test-target
```

## 5. Safety rule

Write commands are limited to `vcopy-test-*` targets or local fixture files. Real project mutation is disabled by default; see `docs/REAL_PROJECT_POLICY.md`.
