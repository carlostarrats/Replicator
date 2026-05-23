# Release Checklist

1. Run `git status --short`.
2. Run `git diff --check`.
3. Run `npm test`.
4. Review `docs/SECURITY_REVIEW.md`.
5. Confirm no generated reports or secrets are staged.
6. Confirm destructive workflows still refuse non-`vcopy-test-*` projects.
7. Update `package.json` version.
8. Commit and tag the release.
