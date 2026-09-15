# Changelog

All notable changes to **LombokDocx** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Python port (`lombokdocx` on PyPI)
- PHP port (`codinglombok/docx` on Packagist)
- Go port
- Performance benchmarks published to `benchmarks/`

---

## [1.0.0] — 2026-08-24

First **stable** release. API is now considered stable under SemVer.

### Added
- Full style fidelity (fonts, colors, alignment, spacing)
- Nested table support
- Comment & tracked-changes extraction (skill module)
- List/numbering reconstruction
- Robust handling of malformed archives
- 90%+ test coverage

### Changed
- Promoted from alpha to stable; public API frozen
- Full CI matrix (Node 18 / 20 / 22)
- GitHub Pages documentation site
- npm provenance publishing

### Fixed
- Edge cases in nested structures surfaced during alpha testing

---

## [0.9.0-alpha] — 2026-07-24

Initial alpha release.

### Added
- DOCX parsing (unzip + WordprocessingML XML parsing)
- Text extraction with paragraph structure
- Basic style preservation (bold, italic, headings)
- Table extraction to HTML
- Embedded image extraction
- Document metadata (core.xml)
- ESM + CommonJS builds

### Known limitations (resolved in 1.0.0)
- Alpha API subject to change
- Multi-language ports not yet available

---

[Unreleased]: https://github.com/codinglombok/LombokDocx/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/codinglombok/LombokDocx/releases/tag/v1.0.0
[0.9.0-alpha]: https://github.com/codinglombok/LombokDocx/releases/tag/v0.9.0-alpha
