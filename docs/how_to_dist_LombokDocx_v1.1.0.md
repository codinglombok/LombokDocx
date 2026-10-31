# LombokDocx — How to Dist v1.1.0

## 1. Registries

| Registry | Name | Status | Mechanism |
|---|---|---|---|
| npm | `lombokdocx` | not yet published | `npm` job in `release.yml` on tag `v*`, `npm publish --provenance --access public`, environment `npm`, secret `NPM_TOKEN` |
| jsDelivr / unpkg | `lombokdocx` | automatic after npm | `https://cdn.jsdelivr.net/npm/lombokdocx@1.1.0/dist/index.js` |
| PyPI / Packagist / Go | `lombokdocx` · `codinglombok/lombokdocx` · `github.com/codinglombok/lombokdocx/go` | not published | ports do not exist yet (stubs); the release workflow keeps guarded `pypi` and `go-tag` jobs that activate when the ports land |
| Docker | — | not declared | no image is produced for this repository |

## 2. Release flow (LombokVector pattern)

1. Every change lands through a PR with green CI (lint, tests + coverage, build, `npm pack --dry-run`, deterministic vector regeneration, `scripts/lombok-doctor.sh`).
2. The version in `package.json`, the `docs/*_v<version>.md` file names, and the top `CHANGELOG.md` entry must match (checked by the doctor and by `check-version`).
3. Optional rehearsal: run `.github/workflows/release-npm.yml` manually (`workflow_dispatch`) with `dry_run=true` (default) — it builds and tests only. A real staged publish sets `dry_run=false` plus a matching `tag` input and passes the `npm` environment reviewers.
4. Full release: tag `v<version>` from `main`. `release.yml` runs `check-version` (tag == manifest == changelog == docs naming == doctor), then publishes to npm with provenance and creates the GitHub Release (git archive bundle + SHA256SUMS).

```bash
git switch main && git pull
npm ci && npm run check
git tag v1.1.0 && git push origin v1.1.0
```

## 3. One-time setup

| Item | Where |
|---|---|
| `NPM_TOKEN` (automation token) | repository secret, used by the `npm` environment |
| npm environment with required reviewers | repository settings, environment `npm` |
| `github-release` environment with required reviewers | repository settings, environment `github-release` |
| PyPI trusted publisher | only when the Python port lands (environment `pypi`) |

## 4. Post-release

```bash
npm view lombokdocx@1.1.0 version
npm i lombokdocx@1.1.0
```

Rollback: `npm deprecate lombokdocx@1.1.0 "use 1.1.1"` (unpublish is only possible within 72 hours and without dependents). Tags are never moved or deleted; the ladder continues with the next version.

*Document licence: Apache-2.0 · © codinglombok*
