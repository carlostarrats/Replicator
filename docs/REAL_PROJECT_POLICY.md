# Real Project Mutation Policy

Real project mutation is disabled by default.

Current write commands may mutate only:

- `vcopy-test-*` projects
- local test fixture files

Before any future real-project write support exists, the tool must add:

- explicit project allowlist config
- mandatory dry-run artifact
- artifact hash confirmation before apply
- typed target project confirmation
- security review update
