# LombokDocx — Guide How to Use v1.1.0

## 1. Installation

```bash
npm install lombokdocx
```

Not yet published to npm while this document is written; meanwhile: `npm install github:codinglombok/LombokDocx`.

## 2. Reading DOCX

```ts
import { DocxExtractor } from 'lombokdocx'

const ex = new DocxExtractor('./report.docx')
const doc = await ex.extract()
doc.metadata.title        // title from docProps/core.xml
doc.blocks                // paragraphs and tables in document order
await ex.extractText()    // plain text
await ex.extractHTML()    // safe HTML fragment
```

In a browser or at the edge, pass the file bytes:

```ts
import { readDocx, renderHTML } from 'lombokdocx'
const bytes = new Uint8Array(await file.arrayBuffer())
const html = renderHTML(readDocx(bytes), { includeTitle: false })
```

## 3. Untrusted files

The default limits stop ZIP bombs and deeply nested XML. Tighten them for upload services:

```ts
import { readDocx, DocxError } from 'lombokdocx'
try {
  readDocx(bytes, { maxEntrySize: 20 * 1024 * 1024, maxTotalSize: 50 * 1024 * 1024, extractImages: false })
} catch (e) {
  if (e instanceof DocxError) console.log(e.code) // INVALID_ZIP, LIMIT_EXCEEDED, ...
}
```

## 4. Creating DOCX

```ts
import { DocxBuilder } from 'lombokdocx'
import { writeFileSync } from 'node:fs'

const bytes = new DocxBuilder()
  .setMetadata({ title: 'Meeting notes', author: 'Secretariat' })
  .addParagraph('Meeting notes', { heading: 1 })
  .addParagraph('The meeting opened at 09:00.', { align: 'justify' })
  .addTable([['No', 'Decision'], ['1', 'Budget approved']])
  .toDocx()
writeFileSync('notes.docx', bytes)
```

## 5. Use-case scenarios

| Scenario | Example |
|---|---|
| Upload previews | show DOCX content in a web app without a server-side conversion step |
| Indexing and search | extract text and metadata for an internal search engine |
| Automated document generation | letters, reports, minutes from application data |
| Content migration | move Word documents into a CMS as clean HTML |
| Edge devices | read DOCX at a gateway with no native dependencies |

## 6. Limitations

See [full_summary_](full_summary_project_LombokDocx_v1.1.0.md), section "Known limitations".

*Document licence: Apache-2.0 · © codinglombok*
