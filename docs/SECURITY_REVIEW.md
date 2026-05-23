# Security Review Checklist

## Secret output review

- Run `npm test`.
- Confirm JSON and Markdown reports contain env names/scopes only.
- Confirm `secrets-migrate` output names keys but never prints values.
- Confirm generated report artifacts are not committed unless reviewed.

## Destructive command review

- Confirm writes require `--test-project-only --apply --yes`.
- Confirm project writes refuse names that do not start with `vcopy-test-`.
- Confirm domain tests use local API test servers or disposable test domains only.
- Confirm `routing-sync` writes only local fixture files.

## Release review

- Run `git diff --check`.
- Run `npm test`.
- Review `git status --short` for generated artifacts.
