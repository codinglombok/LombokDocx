# Changelog

All notable changes to **LombokDocx** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.1.0] — 2026-10-01

Brings the library in line with the Lombok Ecosystem v3.6 standards. Until this
release `DocxExtractor.extract()` returned an empty document for every file; reading
`.docx` files is implemented for the first time here.

### Added
- ZIP reader (stored and deflate, CRC-32 verified) and a DEFLATE decoder (RFC 1951), both dependency-free.
- XML parser that rejects DTDs, resolves only predefined and numeric references, and is iterative with a depth limit.
- WordprocessingML reading: paragraphs, runs, tabs and breaks, hyperlinks, headings (style names and ids), bullet and numbered lists (including numbering inherited from styles), tables with `gridSpan` / `vMerge` and nested tables, DrawingML and VML images, tracked insertions, content controls, transitional and strict namespaces, UTF-16 parts.
- Metadata from `docProps/core.xml` and `docProps/app.xml`.
- `DocxDocument.blocks`: paragraphs and tables in document order.
- `readDocx`, `renderHTML`, `documentToText`, `parseXML`, `ZipReader`, `writeZip`, `inflateRaw`, `crc32` exports.
- `DocxExtractor` accepts a path, `Uint8Array`, or `ArrayBuffer`, plus limits (`maxEntries`, `maxEntrySize`, `maxTotalSize`, `maxDepth`).
- `DocxBuilder.toDocx()` writes a deterministic `.docx`; `toText()`; builder options `strike`, `color`, `fontSize`, `heading`.
- `DocxError` with codes `INVALID_ZIP`, `UNSUPPORTED_ZIP`, `CORRUPT_DATA`, `LIMIT_EXCEEDED`, `INVALID_XML`, `MISSING_PART`.
- `docs/SPEC_LombokDocx_v1.1.0.md`, 163 vectors executed by `tests/vectors.test.ts`, ten standard documents, `scripts/lombok-doctor.sh`.

### Changed
- `DocxImage.data` is a `Uint8Array` (was `Buffer`, never populated); `DocxImage.base64` removed.
- `XMLParser.parse()` throws `DocxError('INVALID_XML')` for malformed input instead of returning a partial tree, keeps whitespace, and no longer sets `XMLElement.text`.
- `DocxBuilder.toHTML()` uses the shared renderer: run formatting is rendered, blocks keep insertion order, and each block ends with a line feed.
- Development tooling upgraded (vitest 5); `package-lock.json` regenerated.

### Fixed
- The previous XML parser trimmed text, did not decode entities, and was quadratic on many children.
- HTML output now escapes `'` and validates colours and link schemes.

### Corrected claims
- The 1.0.0 entry below listed full style fidelity, nested tables, comment and tracked-change extraction, list reconstruction, and robust handling of malformed archives; none of these existed in 1.0.0. The README also advertised extraction of text, images, and metadata from files, memory-efficient streaming, and performance figures. See the known limitations in `docs/full_summary_project_LombokDocx_v1.1.0.md` for what 1.1.0 does and does not do.

## [1.0.0] — 2026-08-24

First **stable** release. API is now considered stable under SemVer.

### Added
- Full style fidelity (fonts, colors, alignment, spacing) — not implemented (corrected in 1.1.0)
- Nested table support — not implemented; added in 1.1.0
- Comment & tracked-changes extraction (skill module) — not implemented (corrected in 1.1.0)
- List/numbering reconstruction — not implemented; lists added in 1.1.0
- Robust handling of malformed archives — not implemented; added in 1.1.0
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
- DOCX parsing (unzip + WordprocessingML XML parsing) — not implemented; added in 1.1.0
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

[Unreleased]: https://github.com/codinglombok/LombokDocx/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/codinglombok/LombokDocx/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/codinglombok/LombokDocx/releases/tag/v1.0.0
[0.9.0-alpha]: https://github.com/codinglombok/LombokDocx/releases/tag/v0.9.0-alpha
