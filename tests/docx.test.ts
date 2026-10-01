import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DocxBuilder, DocxError, DocxExtractor, XMLParser, ZipReader, crc32, decodeXmlBytes, documentToText, escapeHTML, renderHTML,
  mergeRuns, parseXML, readDocx, textContent, writeZip,
} from '../src/index'

describe('LombokDocx - DocxBuilder', () => {
  it('builds empty document', () => {
    const doc = new DocxBuilder().build()
    expect(doc.paragraphs).toHaveLength(0)
    expect(doc.tables).toHaveLength(0)
  })

  it('adds paragraphs', () => {
    const doc = new DocxBuilder()
      .addParagraph('Hello')
      .addParagraph('World')
      .build()

    expect(doc.paragraphs).toHaveLength(2)
    expect(doc.paragraphs[0].text).toBe('Hello')
    expect(doc.paragraphs[1].text).toBe('World')
  })

  it('adds tables', () => {
    const doc = new DocxBuilder()
      .addTable([
        ['A', 'B'],
        ['C', 'D']
      ])
      .build()

    expect(doc.tables).toHaveLength(1)
    expect(doc.tables[0].rows).toHaveLength(2)
    expect(doc.tables[0].rows[0].cells).toHaveLength(2)
  })

  it('sets metadata', () => {
    const doc = new DocxBuilder()
      .setMetadata({ title: 'Test Document', author: 'John Doe' })
      .build()

    expect(doc.metadata.title).toBe('Test Document')
    expect(doc.metadata.author).toBe('John Doe')
  })
})

describe('LombokDocx - HTML Rendering', () => {
  it('renders paragraphs as HTML', () => {
    const html = new DocxBuilder()
      .addParagraph('Hello World')
      .toHTML()

    expect(html).toContain('<p>Hello World</p>')
  })

  it('renders table as HTML', () => {
    const html = new DocxBuilder()
      .addTable([['A', 'B']])
      .toHTML()

    expect(html).toContain('<table>')
    expect(html).toContain('<tr>')
    expect(html).toContain('<td>A</td>')
    expect(html).toContain('<td>B</td>')
  })

  it('renders title from metadata', () => {
    const html = new DocxBuilder()
      .setMetadata({ title: 'My Document' })
      .toHTML()

    expect(html).toContain('<h1>My Document</h1>')
  })

  it('renders complex document', () => {
    const html = new DocxBuilder()
      .setMetadata({ title: 'Report' })
      .addParagraph('Introduction')
      .addParagraph('Content')
      .addTable([
        ['Name', 'Value'],
        ['Item 1', '100'],
        ['Item 2', '200']
      ])
      .addParagraph('Conclusion')
      .toHTML()

    expect(html).toContain('<h1>Report</h1>')
    expect(html).toContain('<p>Introduction</p>')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>Item 1</td>')
  })
})

describe('LombokDocx - HTML Escaping', () => {
  it('escapes HTML entities in text', () => {
    const html = new DocxBuilder()
      .addParagraph('<script>alert("xss")</script>')
      .toHTML()

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes special characters', () => {
    const html = new DocxBuilder()
      .addParagraph('A & B < C > D')
      .toHTML()

    expect(html).toContain('&amp;')
    expect(html).toContain('&lt;')
    expect(html).toContain('&gt;')
  })
})

describe('LombokDocx - Method Chaining', () => {
  it('supports fluent API', () => {
    const doc = new DocxBuilder()
      .addParagraph('P1')
      .addParagraph('P2')
      .addTable([['A', 'B']])
      .setMetadata({ title: 'Title' })
      .build()

    expect(doc.paragraphs).toHaveLength(2)
    expect(doc.tables).toHaveLength(1)
    expect(doc.metadata.title).toBe('Title')
  })
})

describe('LombokDocx - XMLParser', () => {
  it('parses simple XML structure', () => {
    const xml = '<root><child>Text</child></root>'
    const parser = new XMLParser(xml)
    const elem = parser.parse()

    expect(elem).toBeDefined()
    expect(elem.name).toBe('root')
  })

  it('parses attributes', () => {
    const xml = '<div id="test" class="container">Content</div>'
    const parser = new XMLParser(xml)
    const elem = parser.parse()

    expect(elem.name).toBe('div')
  })

  it('parses nested elements', () => {
    const xml = '<root><parent><child>Text</child></parent></root>'
    const parser = new XMLParser(xml)
    const elem = parser.parse()

    expect(elem).toBeDefined()
    expect(elem.name).toBe('root')
  })
})

describe('LombokDocx - Document Types', () => {
  it('handles empty document', () => {
    const doc = new DocxBuilder().build()
    const html = new DocxBuilder().toHTML()

    expect(html).toBeDefined()
    expect(typeof html).toBe('string')
  })

  it('supports metadata-only document', () => {
    const html = new DocxBuilder()
      .setMetadata({
        title: 'Title Only',
        author: 'Author Name',
        subject: 'Subject'
      })
      .toHTML()

    expect(html).toContain('<h1>Title Only</h1>')
  })

  it('supports large tables', () => {
    const rows = Array(10)
      .fill(null)
      .map((_, i) => [`Row ${i}`, `Value ${i}`])

    const html = new DocxBuilder()
      .addTable(rows)
      .toHTML()

    expect(html).toContain('<table>')
    expect(html).toContain('Row 0')
    expect(html).toContain('Row 9')
  })
})

describe('LombokDocx - writer round trip', () => {
  const builder = () =>
    new DocxBuilder()
      .setMetadata({
        title: 'Round trip',
        author: 'Writer',
        subject: 'Subject',
        description: 'Desc',
        lastModifiedBy: 'Editor',
        keywords: ['k1', 'k2'],
        created: new Date('2026-01-02T03:04:05Z'),
        modified: new Date('2026-01-03T00:00:00Z'),
      })
      .addParagraph('Section', { heading: 2 })
      .addParagraph('a <b> & "c"\tTab\nLine', { bold: true, italic: true, underline: true, strike: true, color: '1a2b3c', fontSize: 11.5, align: 'justify' })
      .addParagraph('')
      .addTable([['A', 'B'], ['two\nlines', '']])
      .addTable([['second']])

  it('writes a package that reads back to the same content', () => {
    const doc = readDocx(builder().toDocx())
    expect(doc.metadata).toEqual({
      title: 'Round trip', author: 'Writer', subject: 'Subject', description: 'Desc', lastModifiedBy: 'Editor',
      keywords: ['k1', 'k2'], created: new Date('2026-01-02T03:04:05Z'), modified: new Date('2026-01-03T00:00:00Z'),
    })
    expect(doc.blocks.map(b => b.type)).toEqual(['paragraph', 'paragraph', 'paragraph', 'table', 'paragraph', 'table'])
    expect(doc.paragraphs[0]).toMatchObject({ text: 'Section', style: 'Heading2', heading: 2 })
    expect(doc.paragraphs[1].runs).toEqual([
      { text: 'a <b> & "c"\tTab\nLine', bold: true, italic: true, underline: true, strike: true, color: '#1A2B3C', fontSize: 11.5 },
    ])
    expect(doc.paragraphs[1].formatting).toEqual({ align: 'justify' })
    expect(doc.tables[0].rows[1].cells[0].text).toBe('two\nlines')
    expect(documentToText(doc)).toBe('Section\na <b> & "c"\tTab\nLine\n\nA\tB\ntwo\nlines\t\n\nsecond')
  })

  it('is deterministic', () => {
    expect(Buffer.from(builder().toDocx()).equals(Buffer.from(builder().toDocx()))).toBe(true)
  })

  it('drops characters that XML cannot carry', () => {
    const doc = readDocx(new DocxBuilder().addParagraph('a\u0001b￿').toDocx())
    expect(doc.paragraphs[0].text).toBe('ab')
  })

  it('ignores invalid builder options', () => {
    const doc = new DocxBuilder().addParagraph('x', { heading: 12, color: 'red', fontSize: -1 }).build()
    expect(doc.paragraphs[0]).toEqual({ text: 'x', runs: [{ text: 'x' }] })
  })

  it('writes minimal metadata', () => {
    const doc = readDocx(new DocxBuilder().addParagraph('only').toDocx())
    expect(doc.metadata).toEqual({})
    expect(toText(doc)).toBe('only')
  })
})

function toText(d: Parameters<typeof documentToText>[0]) {
  return documentToText(d)
}

describe('LombokDocx - DocxExtractor', () => {
  const bytes = new DocxBuilder().setMetadata({ title: 'T' }).addParagraph('Hello').toDocx()

  it('reads from Uint8Array', async () => {
    const ex = new DocxExtractor(bytes)
    expect(await ex.extractText()).toBe('Hello')
    expect(await ex.extractHTML()).toBe('<h1>T</h1>\n<p>Hello</p>\n')
    expect(await ex.extractHTML({ includeTitle: false })).toBe('<p>Hello</p>\n')
  })

  it('reads from ArrayBuffer', async () => {
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    expect((await new DocxExtractor(ab).extract()).paragraphs[0].text).toBe('Hello')
  })

  it('reads from a file path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lombokdocx-'))
    const file = join(dir, 'a.docx')
    writeFileSync(file, bytes)
    expect(await new DocxExtractor(file).extractText()).toBe('Hello')
  })

  it('rejects non-ZIP input with a code', async () => {
    await expect(new DocxExtractor(new Uint8Array([1, 2, 3])).extract()).rejects.toMatchObject({ code: 'INVALID_ZIP' })
  })
})

describe('LombokDocx - ZIP and helpers', () => {
  it('writeZip output is readable and verifies CRC-32', () => {
    const z = new ZipReader(writeZip([{ name: 'a.txt', data: 'hello' }, { name: 'b', data: new Uint8Array([0, 1]) }]))
    expect(z.entries.map(e => e.name)).toEqual(['a.txt', 'b'])
    expect(new TextDecoder().decode(z.read('a.txt'))).toBe('hello')
    expect(z.has('b')).toBe(true)
    expect(z.read('nope')).toBeUndefined()
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('escapeHTML escapes all five characters', () => {
    expect(escapeHTML(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })

  it('textContent concatenates descendant text', () => {
    expect(textContent(parseXML('<a>1<b>2<c>3</c></b>4</a>'))).toBe('1234')
  })

  it('decodeXmlBytes handles BOMs', () => {
    expect(decodeXmlBytes(new Uint8Array([0xef, 0xbb, 0xbf, 0x3c, 0x61, 0x2f, 0x3e]))).toBe('<a/>')
    expect(decodeXmlBytes(new Uint8Array([0xfe, 0xff, 0x00, 0x3c]))).toBe('<')
    expect(decodeXmlBytes(new Uint8Array([0xff, 0xfe, 0x3c, 0x00]))).toBe('<')
  })

  it('XMLParser rejects malformed XML with INVALID_XML', () => {
    expect(() => new XMLParser('<a>').parse()).toThrow(DocxError)
  })

  it('mergeRuns keeps image runs separate', () => {
    expect(mergeRuns([{ text: 'a' }, { text: '', image: 'r1' }, { text: 'b' }])).toHaveLength(3)
  })
})

describe('LombokDocx - renderHTML details', () => {
  const img = (data: number[]) => ({ id: 'r1', name: 'word/media/i.png', type: 'image/png', data: new Uint8Array(data) })
  const doc = (blocks: any[], images: any[] = []) => ({ paragraphs: [], tables: [], blocks, images, metadata: {} })

  it('base64 pads one and two trailing bytes', () => {
    const p = { type: 'paragraph', paragraph: { text: '', runs: [{ text: '', image: 'r1' }] } }
    expect(renderHTML(doc([p], [img([0xff])]))).toBe('<p><img src="data:image/png;base64,/w==" alt=""></p>\n')
    expect(renderHTML(doc([p], [img([0xff, 0xee])]))).toBe('<p><img src="data:image/png;base64,/+4=" alt=""></p>\n')
    expect(renderHTML(doc([p], [img([0xff])]), { embedImages: false })).toBe('<p></p>\n')
  })

  it('caps heading level at h6 and ignores malformed colours', () => {
    const p = { type: 'paragraph', paragraph: { text: 'x', heading: 9, runs: [{ text: 'x', color: 'red' }] } }
    expect(renderHTML(doc([p]))).toBe('<h6>x</h6>\n')
  })

  it('renders cells without paragraphs from their text', () => {
    const t = { type: 'table', table: { rows: [{ cells: [{ text: 'a\n<b>' }] }] } }
    expect(renderHTML(doc([t]))).toBe('<table>\n<tr>\n<td>a<br>&lt;b&gt;</td>\n</tr>\n</table>\n')
  })

  it('XMLParser honours maxDepth', () => {
    expect(() => new XMLParser('<a><b/></a>', { maxDepth: 1 }).parse()).not.toThrow()
    expect(() => new XMLParser('<a><b><c/></b></a>', { maxDepth: 1 }).parse()).toThrow(DocxError)
  })
})
