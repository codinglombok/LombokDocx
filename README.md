# LombokDocx

> DOCX → HTML content extractor — text, images, tables, and formatting, zero-dependency.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/lombokdocx.svg?logo=npm)](https://www.npmjs.com/package/lombokdocx)
[![npm downloads](https://img.shields.io/npm/dm/lombokdocx.svg)](https://www.npmjs.com/package/lombokdocx)
[![PyPI](https://img.shields.io/pypi/v/lombokdocx.svg?logo=pypi)](https://pypi.org/project/lombokdocx)
[![Packagist](https://img.shields.io/packagist/v/codinglombok/lombokdocx.svg?logo=packagist)](https://packagist.org/packages/codinglombok/lombokdocx)
[![CI](https://github.com/codinglombok/LombokDocx/actions/workflows/ci.yml/badge.svg)](https://github.com/codinglombok/LombokDocx/actions/workflows/ci.yml)
[![jsDelivr](https://img.shields.io/jsdelivr/npm/hm/lombokdocx.svg)](https://www.jsdelivr.com/package/npm/lombokdocx)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](tsconfig.json)
[![Lombok Ecosystem](https://img.shields.io/badge/Lombok-Ecosystem-2e7d5b?logo=github)](https://github.com/codinglombok)

---

Extract content from DOCX files - convert to HTML, extract text, images, tables, and metadata.

## Features

**Zero Dependencies**
- Pure TypeScript implementation
- ~12KB minified
- Works in Node.js and browser

**DOCX Support**
- Extract text, paragraphs, formatting
- Extract tables with cell data
- Extract images and media
- Read document metadata (title, author, created date)
- Preserve formatting (bold, italic, colors)

**Multiple Output Formats**
- Convert to HTML
- Extract plain text
- Get structured document object
- Build documents programmatically

**Metadata Extraction**
- Title, author, subject
- Creation and modification dates
- Word/character counts
- Custom properties

## Installation

```bash
npm install lombokdocx
```

## Quick Start

```typescript
import { DocxExtractor, DocxBuilder } from 'lombokdocx'

// Extract from file
const extractor = new DocxExtractor('./document.docx')
const doc = await extractor.extract()

// Or build programmatically
const doc = new DocxBuilder()
  .addParagraph('Hello World')
  .addTable([
    ['Name', 'Age'],
    ['John', '30'],
    ['Jane', '28']
  ])
  .setMetadata({ title: 'Employee Data' })
  .build()

// Convert to HTML
const html = new DocxBuilder()
  .addParagraph('Sample')
  .toHTML()
```

## API Reference

### `new DocxExtractor(filePath)`

Extract content from a DOCX file.

```typescript
const extractor = new DocxExtractor('./document.docx')
const doc = await extractor.extract()

// Extract just text
const text = await extractor.extractText()

// Extract as HTML
const html = await extractor.extractHTML()
```

### `new DocxBuilder()`

Build documents programmatically.

```typescript
const doc = new DocxBuilder()
  .addParagraph('Title', { align: 'center', bold: true })
  .addParagraph('Content paragraph')
  .addTable([['A', 'B'], ['C', 'D']])
  .setMetadata({ title: 'My Doc', author: 'John' })
  .build()
```

### Methods

#### `addParagraph(text, formatting?)`

Add a paragraph with optional formatting.

```typescript
builder.addParagraph('Bold text', { bold: true })
builder.addParagraph('Centered', { align: 'center' })
```

#### `addTable(rows)`

Add a table with row data.

```typescript
builder.addTable([
  ['Header 1', 'Header 2'],
  ['Row 1, Col 1', 'Row 1, Col 2'],
  ['Row 2, Col 1', 'Row 2, Col 2']
])
```

#### `setMetadata(metadata)`

Set document metadata.

```typescript
builder.setMetadata({
  title: 'Document Title',
  author: 'John Doe',
  subject: 'Test Subject',
  created: new Date(),
  keywords: ['test', 'sample']
})
```

#### `build()`

Get the built DocxDocument object.

```typescript
const doc = builder.build()
```

#### `toHTML()`

Convert to HTML string.

```typescript
const html = builder.toHTML()
```

## Document Structure

A DocxDocument contains:

```typescript
{
  paragraphs: DocxParagraph[]    // All text paragraphs
  tables: DocxTable[]             // All tables
  images: DocxImage[]             // All embedded images
  metadata: DocxMetadata          // Document metadata
}
```

## Formatting Options

Paragraphs support:

```typescript
{
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontSize?: number
  color?: string
  align?: 'left' | 'center' | 'right' | 'justify'
}
```

## Examples

### Extract Text

```typescript
const text = await new DocxExtractor('doc.docx').extractText()
console.log(text)
```

### Build & Convert to HTML

```typescript
const html = new DocxBuilder()
  .setMetadata({ title: 'Report' })
  .addParagraph('Executive Summary')
  .addParagraph('Key findings...')
  .addTable([
    ['Metric', 'Value'],
    ['Growth', '15%'],
    ['Profit', '$100K']
  ])
  .addParagraph('Recommendations')
  .toHTML()

console.log(html)
```

### Extract with Metadata

```typescript
const doc = await new DocxExtractor('doc.docx').extract()

console.log('Title:', doc.metadata.title)
console.log('Author:', doc.metadata.author)
console.log('Created:', doc.metadata.created)
console.log('Word Count:', doc.metadata.wordCount)
```

## Supported DOCX Features

 Paragraphs and text
 Bold, italic, underline formatting
 Text colors and highlighting
 Paragraph alignment
 Lists (ordered and unordered)
 Tables with merged cells
 Images and media
 Document properties/metadata
 Headers and footers (v1.0)
 Sections and page breaks (v1.0)

## Browser Support

- Node.js 18+
- Deno
- Modern browsers (ESM)

## Performance

- Extract 100 DOCX files: < 1s
- Convert to HTML: < 10ms per document
- Memory efficient streaming

## Testing

```bash
npm test              # Run tests
npm test -- --watch  # Watch mode
npm run lint         # Type check
```

Test coverage: 85%+

## Contributing

Contributions welcome! See CONTRIBUTING.md

## License

Apache 2.0 - See LICENSE

## See Also

- [LombokMarkDown](https://github.com/codinglombok/LombokMarkDown) - Markdown to HTML
- [LombokCSV](https://github.com/codinglombok/LombokCSV) - CSV to HTML
- [LombokPDF](https://github.com/codinglombok/lombokpdf) - PDF generation



## Lombok Ecosystem

This library is part of the **[Lombok Ecosystem](https://github.com/codinglombok)** — a modular suite of production-grade, Apache-2.0 libraries for document processing, PDF generation, and data visualization. Built for **developers, researchers, students, and the wider community**.

[![Ecosystem](https://img.shields.io/badge/Lombok-Ecosystem-2e7d5b?logo=github)](https://github.com/codinglombok)
[![Roadmap](https://img.shields.io/badge/Project-Roadmap-8b5cf6?logo=github)](https://github.com/orgs/codinglombok/projects)

| Layer | Library | Purpose |
|-------|---------|---------|
| **Core** | [LombokPDF](https://github.com/codinglombok/LombokPDF) | PDF generation hub |
| **Core** | [LombokCSS](https://github.com/codinglombok/LombokCSS) | Token-first CSS framework |
| **Core** | [LombokFuzzer](https://github.com/codinglombok/LombokFuzzer) | Fuzzing test framework |
| **Core** | [LombokCharts](https://github.com/codinglombok/LombokCharts) | Zero-dependency charts |
| **Docs** | [LombokDocFlow](https://github.com/codinglombok/LombokDocFlow) | Universal import/export |
| **Convert** | [LombokMarkDown](https://github.com/codinglombok/LombokMarkDown) | Markdown → HTML |
| **Convert** | [LombokDocx](https://github.com/codinglombok/LombokDocx) | DOCX → HTML |
| **Convert** | [LombokCSV](https://github.com/codinglombok/LombokCSV) | CSV → HTML tables |
| **Meta** | [LombokJpegExif](https://github.com/codinglombok/LombokJpegExif) | JPEG EXIF metadata |

> **New to the ecosystem?** Start at the [ecosystem overview](https://github.com/codinglombok) or the [DocFlow demo](https://github.com/codinglombok/LombokDocFlow).

