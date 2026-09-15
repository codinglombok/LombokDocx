/**
 * LombokDocx - Type definitions
 */

export interface DocxOptions {
  extractImages?: boolean
  extractMetadata?: boolean
  preserveFormatting?: boolean
}

export interface DocxDocument {
  paragraphs: DocxParagraph[]
  tables: DocxTable[]
  images: DocxImage[]
  metadata: DocxMetadata
}

export interface DocxParagraph {
  text: string
  formatting?: {
    bold?: boolean
    italic?: boolean
    underline?: boolean
    fontSize?: number
    color?: string
    align?: 'left' | 'center' | 'right' | 'justify'
  }
  runs: DocxRun[]
}

export interface DocxRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
}

export interface DocxTable {
  rows: DocxTableRow[]
  width?: number
}

export interface DocxTableRow {
  cells: DocxTableCell[]
}

export interface DocxTableCell {
  text: string
  colSpan?: number
  rowSpan?: number
  paragraphs?: DocxParagraph[]
}

export interface DocxImage {
  id: string
  name: string
  type: string
  data: Buffer
  base64?: string
}

export interface DocxMetadata {
  title?: string
  author?: string
  created?: Date
  modified?: Date
  subject?: string
  keywords?: string[]
  pageCount?: number
  wordCount?: number
  characterCount?: number
}

export interface XMLElement {
  name: string
  attributes: Record<string, string>
  children: (XMLElement | string)[]
  text?: string
}
