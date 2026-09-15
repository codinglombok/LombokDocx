# Contributing to LombokDocx

Thank you for your interest in contributing! LombokDocx is part of the
[Lombok Ecosystem](https://github.com/codinglombok).

## Ways to contribute

-  **Report bugs** — open an issue with a minimal reproduction
-  **Request features** — describe the use case
-  **Port to another language** — Python, PHP, Go ports welcome
-  **Improve docs** — typos, examples, tutorials
-  **Add tests** — we aim for 90%+ coverage

## Development setup

```bash
git clone https://github.com/codinglombok/LombokDocx.git
cd LombokDocx
npm install
npm test
```

## Pull request process

1. Fork and create a feature branch (`git checkout -b feature/my-feature`)
2. Write tests for your change
3. Ensure `npm run lint && npm run build && npm test` passes
4. Update `CHANGELOG.md` under `[Unreleased]`
5. Open a PR against `main`

## Code style

- TypeScript strict mode, no `any`
- Zero runtime dependencies (Stage 1 principle)
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)

## Adding a language port

Ports live under `ports/{lang}/`. Each port must:
- Implement the identical public API
- Pass the same test fixtures (`tests/fixtures/`)
- Include its own README with install instructions

## License

By contributing you agree your work is licensed under Apache-2.0.
