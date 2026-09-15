import { XMLElement, DocxDocument, DocxParagraph, DocxTable, DocxMetadata, DocxImage, DocxRun } from './types.js'
import { createReadStream } from 'fs'

/**
 * Simple XML parser for DOCX extraction
 */
export class XMLParser {
  private xml: string

  constructor(xml: string) {
    this.xml = xml
  }

  /**
   * Parse XML string to element tree
   */
  parse(): XMLElement {
    const root = this.parseElement(this.xml, 0)
    return root as XMLElement
  }

  private parseElement(xml: string, startPos: number): XMLElement | null {
    const trimmed = xml.substring(startPos).trimStart()
    if (!trimmed.startsWith('<')) return null

    // Get tag name
    const tagMatch = trimmed.match(/^<([a-zA-Z0-9:\-_]+)/)
    if (!tagMatch) return null

    const tagName = tagMatch[1]
    const openTagEnd = trimmed.indexOf('>')

    if (openTagEnd === -1) return null

    // Parse attributes
    const openTag = trimmed.substring(0, openTagEnd + 1)
    const attrString = openTag.substring(tagName.length + 1, openTagEnd).trim()
    const attributes = this.parseAttributes(attrString)

    // Check for self-closing tag
    if (openTag.endsWith('/>')) {
      return {
        name: tagName,
        attributes,
        children: []
      }
    }

    // Find closing tag
    const closeTagPattern = new RegExp(`</${tagName.split(':')[1] || tagName}>`, 'i')
    const closeTagMatch = trimmed.substring(openTagEnd).match(closeTagPattern)

    if (!closeTagMatch) {
      return {
        name: tagName,
        attributes,
        children: []
      }
    }

    // Extract content between tags
    const contentStart = openTagEnd + 1
    const contentEnd = trimmed.indexOf(closeTagMatch[0])
    const content = trimmed.substring(contentStart, contentEnd).trim()

    // Parse children
    const children: (XMLElement | string)[] = []
    let pos = 0

    while (pos < content.length) {
      if (content[pos] === '<') {
        const child = this.parseElement(content, pos)
        if (child) {
          children.push(child)
          const childStr = this.elementToString(child)
          pos += content.substring(pos).indexOf(childStr) + childStr.length
        } else {
          pos++
        }
      } else {
        const textEnd = content.indexOf('<', pos)
        const text = textEnd === -1 ? content.substring(pos) : content.substring(pos, textEnd)
        if (text.trim()) {
          children.push(text.trim())
        }
        pos = textEnd === -1 ? content.length : textEnd
      }
    }

    return {
      name: tagName,
      attributes,
      children,
      text: content
    }
  }

  private parseAttributes(attrString: string): Record<string, string> {
    const attributes: Record<string, string> = {}
    const attrRegex = /([a-zA-Z0-9:\-_]+)="([^"]*)"/g
    let match

    while ((match = attrRegex.exec(attrString)) !== null) {
      attributes[match[1]] = match[2]
    }

    return attributes
  }

  private elementToString(elem: XMLElement): string {
    const attrs = Object.entries(elem.attributes)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')

    const attrStr = attrs ? ` ${attrs}` : ''
    return `<${elem.name}${attrStr}></${elem.name}>`
  }
}

/**
 * DOCX file extractor
 * Main class for working with DOCX files
 */
export class DocxExtractor {
  private filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  /**
   * Extract content from DOCX file
   */
  async extract(): Promise<DocxDocument> {
    // Note: Full implementation requires unzip library
    // For MVP, we parse XML directly

    return {
      paragraphs: [],
      tables: [],
      images: [],
      metadata: {}
    }
  }

  /**
   * Extract text only (no formatting)
   */
  async extractText(): Promise<string> {
    const doc = await this.extract()
    return doc.paragraphs.map(p => p.text).join('\n')
  }

  /**
   * Extract to HTML
   */
  async extractHTML(): Promise<string> {
    const doc = await this.extract()
    return this.renderHTML(doc)
  }

  private renderHTML(doc: DocxDocument): string {
    const html: string[] = []

    // Add metadata
    if (doc.metadata.title) {
      html.push(`<h1>${this.escape(doc.metadata.title)}</h1>`)
    }

    // Add paragraphs
    for (const para of doc.paragraphs) {
      html.push(this.renderParagraph(para))
    }

    // Add tables
    for (const table of doc.tables) {
      html.push(this.renderTable(table))
    }

    return html.join('')
  }

  private renderParagraph(para: DocxParagraph): string {
    const formatting = para.formatting || {}
    const align = formatting.align ? ` style="text-align: ${formatting.align}"` : ''

    let content = ''
    for (const run of para.runs) {
      let runHtml = this.escape(run.text)

      if (run.bold) runHtml = `<strong>${runHtml}</strong>`
      if (run.italic) runHtml = `<em>${runHtml}</em>`
      if (run.underline) runHtml = `<u>${runHtml}</u>`
      if (run.color) runHtml = `<span style="color: ${run.color}">${runHtml}</span>`

      content += runHtml
    }

    return `<p${align}>${content}</p>`
  }

  private renderTable(table: DocxTable): string {
    let html = '<table>\n'

    for (const row of table.rows) {
      html += '<tr>\n'
      for (const cell of row.cells) {
        html += `<td>${this.escape(cell.text)}</td>\n`
      }
      html += '</tr>\n'
    }

    html += '</table>'
    return html
  }

  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}

/**
 * In-memory DOCX document builder for testing
 */
export class DocxBuilder {
  private doc: DocxDocument = {
    paragraphs: [],
    tables: [],
    images: [],
    metadata: {}
  }

  addParagraph(text: string, formatting?: any): this {
    this.doc.paragraphs.push({
      text,
      formatting,
      runs: [{ text }]
    })
    return this
  }

  addTable(rows: string[][]): this {
    this.doc.tables.push({
      rows: rows.map(row => ({
        cells: row.map(cellText => ({ text: cellText }))
      }))
    })
    return this
  }

  setMetadata(metadata: Partial<DocxMetadata>): this {
    this.doc.metadata = { ...this.doc.metadata, ...metadata }
    return this
  }

  build(): DocxDocument {
    return this.doc
  }

  toHTML(): string {
    const html: string[] = []

    if (this.doc.metadata.title) {
      html.push(`<h1>${this.escape(this.doc.metadata.title)}</h1>`)
    }

    for (const para of this.doc.paragraphs) {
      html.push(this.renderParagraph(para))
    }

    for (const table of this.doc.tables) {
      html.push(this.renderTable(table))
    }

    return html.join('')
  }

  private renderParagraph(para: DocxParagraph): string {
    const align = para.formatting?.align ? ` style="text-align: ${para.formatting.align}"` : ''
    let content = ''

    for (const run of para.runs) {
      let text = this.escape(run.text)
      if (run.bold) text = `<strong>${text}</strong>`
      if (run.italic) text = `<em>${text}</em>`
      content += text
    }

    return `<p${align}>${content}</p>`
  }

  private renderTable(table: DocxTable): string {
    let html = '<table>\n'

    for (const row of table.rows) {
      html += '<tr>'
      for (const cell of row.cells) {
        html += `<td>${this.escape(cell.text)}</td>`
      }
      html += '</tr>\n'
    }

    html += '</table>'
    return html
  }

  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
}
