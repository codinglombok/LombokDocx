import { describe, it, expect } from 'vitest'
import { DocxBuilder, XMLParser } from '../src/docx'

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
