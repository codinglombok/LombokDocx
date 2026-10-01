# LombokDocx

> Read and write Word `.docx` files with zero dependencies: text, headings, lists, tables with merged cells, links, images, and metadata, with safe HTML output.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/codinglombok/LombokDocx/actions/workflows/ci.yml/badge.svg)](https://github.com/codinglombok/LombokDocx/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](tsconfig.json)
[![Lombok Ecosystem](https://img.shields.io/badge/Lombok-Ecosystem-2e7d5b?logo=github)](https://github.com/codinglombok)

Part of the [Lombok Ecosystem](https://github.com/codinglombok).

## Mengapa library ini? (Why this library?)

- Everything needed to open a `.docx` lives in the package: a ZIP reader, a DEFLATE decoder (RFC 1951), and an XML parser. No native modules and no runtime dependencies, so it runs in Node.js, Deno, Bun, browsers, and edge runtimes.
- Built for untrusted uploads: DTDs are rejected, decompression is bounded (ZIP bombs stop early), XML depth is limited, and HTML output escapes all text, blocks `javascript:` links, and never inlines SVG.
- Behaviour is specified in a normative [SPEC](docs/SPEC_LombokDocx_v1.1.0.md) and pinned by 163 shared vectors whose ZIP/DEFLATE expectations come from Python's `zlib` and `zipfile`, so future language ports can be proven identical.
- It can also write simple `.docx` files (headings, formatted paragraphs, tables, metadata) with deterministic bytes.

Typical uses: previewing uploads in a web app, indexing documents for search, generating letters and reports, and migrating Word content into a CMS.

## Installation

```bash
npm install lombokdocx
```

Not yet published to npm; until then install from GitHub with `npm install github:codinglombok/LombokDocx`.

## Quick start

```ts
import { DocxExtractor, DocxBuilder, readDocx, renderHTML } from 'lombokdocx'

// Node.js / Deno / Bun: from a path
const ex = new DocxExtractor('./report.docx')
const doc = await ex.extract()
console.log(doc.metadata.title, doc.blocks.length)
console.log(await ex.extractText())
console.log(await ex.extractHTML())

// Any runtime: from bytes
const html = renderHTML(readDocx(new Uint8Array(await file.arrayBuffer())))

// Write a .docx
const bytes = new DocxBuilder()
  .setMetadata({ title: 'Meeting notes', author: 'Secretariat' })
  .addParagraph('Meeting notes', { heading: 1 })
  .addParagraph('Opened at 09:00.', { italic: true })
  .addTable([['No', 'Decision'], ['1', 'Budget approved']])
  .toDocx()
```

## What is read

| Area | Supported |
|---|---|
| Text | paragraphs, runs, tabs, line breaks, non-breaking and soft hyphens, field results, tracked insertions (deletions dropped), content controls |
| Formatting | bold, italic, underline, strike, colour, font size (direct formatting), paragraph alignment |
| Structure | headings 1-9 (from style names, also localised style ids), bullet and numbered lists with nesting, tables with `gridSpan` / `vMerge`, nested tables, document order across paragraphs and tables |
| Links and media | external hyperlinks and bookmark anchors, embedded images (DrawingML and VML) |
| Metadata | title, subject, author, keywords, description, last modified by, created/modified dates, page/word/character counts |
| Packages | stored and deflated ZIP entries with CRC-32 checks, transitional and strict OOXML namespaces, any namespace prefix, UTF-8 and UTF-16 parts |

Errors are `DocxError` with a stable `code`: `INVALID_ZIP`, `UNSUPPORTED_ZIP`, `CORRUPT_DATA`, `LIMIT_EXCEEDED`, `INVALID_XML`, `MISSING_PART`.

Full API: [docs/API_LombokDocx_v1.1.0.md](docs/API_LombokDocx_v1.1.0.md). Guide: [docs/guide_how_to_use_LombokDocx_v1.1.0.md](docs/guide_how_to_use_LombokDocx_v1.1.0.md).

## Known limitations

Headers, footers, footnotes, comments, text boxes, and equations are not read; formatting inherited from character or paragraph styles is not applied (headings and list numbering are); ZIP64 and encrypted files are rejected; list numbers are not computed into the text; the whole file is held in memory. See [Known limitations](docs/full_summary_project_LombokDocx_v1.1.0.md#2-batasan-yang-diketahui).

## Language ports

| Language | Status |
|---|---|
| TypeScript / JavaScript | Reference implementation, passes all 163 vectors |
| Python, Go, PHP | Planned (stub README only, no code yet) |

## Security

Guarantees are normative in [SPEC section 8](docs/SPEC_LombokDocx_v1.1.0.md#8-keamanan-normatif). Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

## Development

```bash
npm ci
npm run check   # lint, tests with coverage, build, standards check
npm run fuzz    # fuzz the XML parser and package reader
```

## Related libraries

- [LombokMarkDown](https://github.com/codinglombok/LombokMarkDown) — Markdown to HTML
- [LombokCSV](https://github.com/codinglombok/LombokCSV) — CSV parsing and HTML tables
- [LombokHTML](https://github.com/codinglombok/LombokHTML) — HTML parsing and sanitising

## License

Apache-2.0. See [LICENSE](LICENSE).
