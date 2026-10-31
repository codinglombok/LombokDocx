# LombokDocx — API v1.1.0

Public API reference of the npm package `lombokdocx` 1.1.0. Normative behaviour: [SPEC_](SPEC_LombokDocx_v1.1.0.md).

## 1. Reading

| Export | Signature | Notes |
|---|---|---|
| `readDocx` | `(bytes: Uint8Array, options?: DocxOptions) => DocxDocument` | synchronous, all runtimes |
| `DocxExtractor` | `new DocxExtractor(source: string \| Uint8Array \| ArrayBuffer, options?)` | `source` string = file path (Node.js/Deno/Bun) |
| `DocxExtractor#extract()` | `Promise<DocxDocument>` | result cached per instance |
| `DocxExtractor#extractText()` | `Promise<string>` | SPEC §5 |
| `DocxExtractor#extractHTML(options?)` | `Promise<string>` | SPEC §6 |
| `documentToText` | `(doc) => string` | SPEC §5 |
| `renderHTML` | `(doc, options?: HTMLRenderOptions) => string` | SPEC §6 |

`DocxOptions`: `extractImages` (default `true`), `extractMetadata` (`true`), `preserveFormatting` (`true`), `maxEntries` (10 000), `maxEntrySize` (100 MiB), `maxTotalSize` (256 MiB), `maxDepth` (256).

`HTMLRenderOptions`: `includeTitle` (default `true`), `embedImages` (`true`).

## 2. Document model

```ts
interface DocxDocument {
  paragraphs: DocxParagraph[]   // top-level paragraphs, document order
  tables: DocxTable[]           // top-level tables, document order
  blocks: DocxBlock[]           // paragraphs and tables interleaved, document order (new in 1.1.0)
  images: DocxImage[]
  metadata: DocxMetadata
}
type DocxBlock = { type: 'paragraph'; paragraph: DocxParagraph } | { type: 'table'; table: DocxTable }
interface DocxParagraph {
  text: string; runs: DocxRun[]; style?: string; heading?: number
  list?: { numId: string; level: number; ordered: boolean }
  formatting?: { align?: 'left' | 'center' | 'right' | 'justify' }
}
interface DocxRun {
  text: string; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean
  color?: string /* #RRGGBB */; fontSize?: number /* pt */; href?: string; image?: string /* rId */
}
interface DocxTable { rows: { cells: DocxTableCell[] }[]; width?: number }
interface DocxTableCell { text: string; colSpan?: number; rowSpan?: number; paragraphs?: DocxParagraph[]; tables?: DocxTable[] }
interface DocxImage { id: string; name: string; type: string; data: Uint8Array }
interface DocxMetadata {
  title?, author?, subject?, description?, lastModifiedBy?: string; keywords?: string[]
  created?, modified?: Date; pageCount?, wordCount?, characterCount?: number
}
```

## 3. Writing

| Export | Notes |
|---|---|
| `new DocxBuilder()` | in-memory document builder |
| `.addParagraph(text, options?)` | `options`: `bold`, `italic`, `underline`, `strike`, `color` (`#RRGGBB`), `fontSize` (pt), `align`, `heading` (1-9) |
| `.addTable(rows: string[][])` | LF inside a cell becomes separate paragraphs |
| `.setMetadata(partial)` | title, author, keywords, dates, ... |
| `.build()` | `DocxDocument` |
| `.toHTML(options?)` / `.toText()` | same renderer as reading |
| `.toDocx()` | `Uint8Array` .docx file (deterministic, SPEC §7) |

## 4. Low level

| Export | Notes |
|---|---|
| `parseXML(xml, { maxDepth })`, `XMLParser` | safe XML parser (SPEC §3); `XMLParser` kept from 1.0.0 |
| `textContent(el)`, `decodeXmlBytes(bytes)` | XML utilities |
| `ZipReader`, `writeZip`, `crc32` | ZIP (SPEC §2.2-§2.3) |
| `inflateRaw(bytes, maxSize, expectedSize?)` | DEFLATE (SPEC §2.1) |
| `escapeHTML`, `mergeRuns` | utilities |
| `DocxError` (`code: DocxErrorCode`) | SPEC §1 |

## 5. Compatibility with 1.0.0

All 1.0.0 names remain exported. Changes: `DocxImage.data` is now a `Uint8Array` (was a never-populated `Buffer`), `DocxImage.base64` was removed, `XMLElement.text` is no longer set, `XMLParser.parse()` throws `DocxError` for malformed XML (previously returned a partial tree), and `DocxBuilder.toHTML()` now renders run formatting and separates blocks with LF.

*Document licence: Apache-2.0 · © codinglombok*
