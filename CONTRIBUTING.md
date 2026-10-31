# Contributing to LombokDocx

Thank you for your interest in contributing. LombokDocx is part of the
[Lombok Ecosystem](https://github.com/codinglombok).

## Ways to contribute

- **Report bugs** — open an issue with a minimal reproduction
- **Request features** — describe the use case
- **Port to another language** — Python, PHP, Go ports welcome
- **Improve docs** — typos, examples, tutorials
- **Add tests** — we aim for 90%+ coverage

## Development setup

```bash
git clone https://github.com/codinglombok/LombokDocx.git
cd LombokDocx
npm ci
npm run check
```

## Pull request process

1. Fork and create a feature branch (`git checkout -b feature/my-feature`)
2. Behaviour changes start in the specification: update `docs/SPEC_LombokDocx_v<version>.md`,
   add cases to `vectors/build_vectors.py` (hand-written expected values for XML/DOCX; ZIP/DEFLATE
   streams from the deterministic pure-Python encoder, verified against zlib at generation time), run `npm run vectors`,
   and update `vectors/SHA256SUMS` and the hash in the SPEC
3. Ensure `npm run check` passes (lint, tests with coverage, build, `scripts/lombok-doctor.sh`)
4. Update `CHANGELOG.md` under `[Unreleased]` (newest entries first)
5. Open a PR against `main`

## Code style

- TypeScript strict mode
- Zero runtime dependencies
- No emoji in Markdown files; no client, organisation, or customer names in code, tests, docs, or commit messages
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)

## Adding a language port

Ports live in their own root folder (`python/`, `go/`, `php/`; the TypeScript
reference stays at the repository root). Each port must:
- Implement the identical public API and the SPEC error codes
- Ship a runner that executes every case in `vectors/lombokdocx-vectors-v1.json` with byte-identical results
- Include its own README with install instructions

CI picks the port up automatically: each language folder has a guarded job in
`.github/workflows/ci.yml` that activates once code exists (`hashFiles`).

## License

By contributing you agree your work is licensed under Apache-2.0.
