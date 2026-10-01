# LombokDocx — API v1.1.0

Referensi API publik paket npm `lombokdocx` 1.1.0. Perilaku normatif: [SPEC_](SPEC_LombokDocx_v1.1.0.md).

## 1. Membaca

| Ekspor | Tanda tangan | Catatan |
|---|---|---|
| `readDocx` | `(bytes: Uint8Array, options?: DocxOptions) => DocxDocument` | sinkron, semua runtime |
| `DocxExtractor` | `new DocxExtractor(source: string \| Uint8Array \| ArrayBuffer, options?)` | `source` string = path berkas (Node.js/Deno/Bun) |
| `DocxExtractor#extract()` | `Promise<DocxDocument>` | hasil di-cache per instance |
| `DocxExtractor#extractText()` | `Promise<string>` | SPEC §5 |
| `DocxExtractor#extractHTML(options?)` | `Promise<string>` | SPEC §6 |
| `documentToText` | `(doc) => string` | SPEC §5 |
| `renderHTML` | `(doc, options?: HTMLRenderOptions) => string` | SPEC §6 |

`DocxOptions`: `extractImages` (bawaan `true`), `extractMetadata` (`true`), `preserveFormatting` (`true`), `maxEntries` (10 000), `maxEntrySize` (100 MiB), `maxTotalSize` (256 MiB), `maxDepth` (256).

`HTMLRenderOptions`: `includeTitle` (bawaan `true`), `embedImages` (`true`).

## 2. Model dokumen

```ts
interface DocxDocument {
  paragraphs: DocxParagraph[]   // paragraf tingkat atas, urut dokumen
  tables: DocxTable[]           // tabel tingkat atas, urut dokumen
  blocks: DocxBlock[]           // paragraf dan tabel bercampur, urut dokumen (baru 1.1.0)
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

## 3. Menulis

| Ekspor | Catatan |
|---|---|
| `new DocxBuilder()` | pembangun dokumen di memori |
| `.addParagraph(text, options?)` | `options`: `bold`, `italic`, `underline`, `strike`, `color` (`#RRGGBB`), `fontSize` (pt), `align`, `heading` (1-9) |
| `.addTable(rows: string[][])` | LF di sel menjadi paragraf terpisah |
| `.setMetadata(partial)` | judul, penulis, kata kunci, tanggal, ... |
| `.build()` | `DocxDocument` |
| `.toHTML(options?)` / `.toText()` | renderer yang sama dengan pembacaan |
| `.toDocx()` | `Uint8Array` berkas .docx (deterministik, SPEC §7) |

## 4. Tingkat rendah

| Ekspor | Catatan |
|---|---|
| `parseXML(xml, { maxDepth })`, `XMLParser` | parser XML aman (SPEC §3); `XMLParser` dipertahankan dari 1.0.0 |
| `textContent(el)`, `decodeXmlBytes(bytes)` | utilitas XML |
| `ZipReader`, `writeZip`, `crc32` | ZIP (SPEC §2.2-§2.3) |
| `inflateRaw(bytes, maxSize, expectedSize?)` | DEFLATE (SPEC §2.1) |
| `escapeHTML`, `mergeRuns` | utilitas |
| `DocxError` (`code: DocxErrorCode`) | SPEC §1 |

## 5. Kompatibilitas dengan 1.0.0

Semua nama 1.0.0 tetap diekspor. Perubahan: `DocxImage.data` kini `Uint8Array` (sebelumnya `Buffer`, tidak pernah terisi), `DocxImage.base64` dihapus, `XMLElement.text` tidak lagi diisi, `XMLParser.parse()` melempar `DocxError` untuk XML rusak (sebelumnya mengembalikan pohon parsial), dan `DocxBuilder.toHTML()` kini merender format run dan memisahkan blok dengan LF.

*Lisensi dokumen: Apache-2.0 · © codinglombok*
