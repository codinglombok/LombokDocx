/**
 * Edge-case tests: malformed XML, malformed ZIP archives, DEFLATE failure
 * paths, and WordprocessingML structures the vectors cover only partially.
 * Normative behaviour: docs/SPEC_LombokDocx_v1.1.0.md.
 */
import { describe, it, expect } from 'vitest'
import {
  DocxBuilder, DocxError, ZipReader, inflateRaw, parseXML, readDocx, renderHTML, writeZip,
} from '../src/index'

describe('parseXML edge cases', () => {
  const codeOf = (fn: () => unknown): string => {
    try {
      fn()
    } catch (e) {
      expect(e).toBeInstanceOf(DocxError)
      return (e as DocxError).code
    }
    throw new Error('expected a throw')
  }

  it.each([
    ['unterminated start tag', '<a href="x'],
    ['empty element name', '<></a>'],
    ['attribute without value', '<a href></a>'],
    ['unquoted attribute value', '<a href=x></a>'],
    ["'<' in attribute value", '<a href="<"></a>'],
    ['malformed end tag', '<a></a attr>'],
    ['unterminated PI', '<a><?pi</a>'],
    ['unterminated CDATA', '<a><![CDATA[x</a>'],
    ['CDATA outside the root', '<![CDATA[x]]>'],
    ['attribute name missing', '<a ="v"></a>'],
    ['malformed self-closing', '<a/ >'],
  ])('rejects %s with INVALID_XML', (_name, xml) => {
    expect(codeOf(() => parseXML(xml))).toBe('INVALID_XML')
  })

  it('rejects depth violations and honours self-closing at the limit', () => {
    expect(codeOf(() => parseXML('<a><b><c></c></b></a>', { maxDepth: 2 }))).toBe('LIMIT_EXCEEDED')
    expect(() => parseXML('<a><b/><c/></a>', { maxDepth: 1 })).not.toThrow()
  })

  it('keeps adjacent text nodes separate and whitespace intact', () => {
    const el = parseXML('<a>x<b/>y</a>')
    expect(el.children.filter(c => typeof c === 'string')).toEqual(['x', 'y'])
    expect(parseXML('<a>  </a>').children).toEqual(['  '])
  })
})

describe('ZipReader edge cases', () => {
  const stored = (files: { name: string; data: string }[]) => writeZip(files)
  const patch8 = (bytes: Uint8Array, at: number, value: number) => {
    const out = new Uint8Array(bytes)
    out[at] = value
    return out
  }
  const patch32 = (bytes: Uint8Array, at: number, value: number) => {
    const out = new Uint8Array(bytes)
    new DataView(out.buffer).setUint32(at, value, true)
    return out
  }
  const codeOf = (fn: () => unknown): string => {
    try {
      fn()
    } catch (e) {
      expect(e).toBeInstanceOf(DocxError)
      return (e as DocxError).code
    }
    throw new Error('expected a throw')
  }

  it('rejects multi-disk archives', () => {
    const z = stored([{ name: 'a', data: 'x' }])
    const eocd = z.length - 22
    expect(codeOf(() => new ZipReader(patch8(z, eocd + 4, 1)))).toBe('UNSUPPORTED_ZIP')
  })

  it('rejects ZIP64 markers in entry fields', () => {
    const z = stored([{ name: 'a', data: 'x' }])
    expect(codeOf(() => new ZipReader(patch32(z, findCd(z) + 20, 0xffffffff)))).toBe('UNSUPPORTED_ZIP')
  })

  it('rejects encrypted entries and unknown methods on read', () => {
    const encrypted = patch8(patch8(stored([{ name: 'a', data: 'x' }]), findCd(stored([{ name: 'a', data: 'x' }])) + 8, 1), 6, 1)
    expect(codeOf(() => new ZipReader(encrypted).read('a'))).toBe('UNSUPPORTED_ZIP')
    const m = stored([{ name: 'a', data: 'x' }])
    const method = patch8(patch8(m, findCd(m) + 10, 12), 8, 12)
    expect(codeOf(() => new ZipReader(method).read('a'))).toBe('UNSUPPORTED_ZIP')
  })

  it('rejects stored size mismatch and out-of-range data', () => {
    const z = stored([{ name: 'a', data: 'payload' }])
    const cd = findCd(z)
    expect(codeOf(() => new ZipReader(patch32(z, cd + 24, 3)).read('a'))).toBe('CORRUPT_DATA')
    // truncating past the EOCD fails in the constructor; truncating into the
    // entry data fails on read
    expect(codeOf(() => new ZipReader(z.subarray(0, z.length - 4)))).toBe('INVALID_ZIP')
    const short = z.subarray(0, z.length - 2)
    expect(codeOf(() => new ZipReader(short).read('a'))).toBe('INVALID_ZIP')
  })

  it('rejects a central directory outside the file and entry-count limits', () => {
    const z = stored([{ name: 'a', data: 'x' }])
    const eocd = z.length - 22
    expect(codeOf(() => new ZipReader(patch32(z, eocd + 16, 0xfffff000)))).toBe('INVALID_ZIP')
    expect(codeOf(() => new ZipReader(z, { maxEntries: 0 }))).toBe('LIMIT_EXCEEDED')
  })

  it('accumulates the total-size limit across reads', () => {
    const z = new ZipReader(stored([{ name: 'a', data: 'x'.repeat(600) }, { name: 'b', data: 'y'.repeat(600) }]), { maxTotalSize: 1000 })
    z.read('a')
    expect(codeOf(() => z.read('b'))).toBe('LIMIT_EXCEEDED')
  })

  it('writeZip output survives a re-read with UTF-8 names', () => {
    const z = new ZipReader(stored([{ name: 'ñame/日本.txt', data: 'é' }]))
    expect(z.entries[0].name).toBe('ñame/日本.txt')
    expect(new TextDecoder().decode(z.read('ñame/日本.txt'))).toBe('é')
  })
})

function findCd(z: Uint8Array): number {
  for (let i = z.length - 22; i >= 0; i--) {
    if (z[i] === 0x50 && z[i + 1] === 0x4b && z[i + 2] === 0x01 && z[i + 3] === 0x02) return i
  }
  throw new Error('no central directory')
}

describe('inflateRaw edge cases', () => {
  const codeOf = (fn: () => unknown): string => {
    try {
      fn()
    } catch (e) {
      expect(e).toBeInstanceOf(DocxError)
      return (e as DocxError).code
    }
    throw new Error('expected a throw')
  }

  it('raises CORRUPT_DATA for a distance beyond the history and for garbage', () => {
    expect(codeOf(() => inflateRaw(new Uint8Array([0x63, 0x00, 0x02]), 100))).toBe('CORRUPT_DATA')
    expect(codeOf(() => inflateRaw(new Uint8Array([]), 100))).toBe('CORRUPT_DATA')
  })

  it('raises LIMIT_EXCEEDED when the output exceeds maxSize', () => {
    // one stored block declaring 10 bytes
    const stream = new Uint8Array([0x01, 0x0a, 0x00, 0xf5, 0xff, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(codeOf(() => inflateRaw(stream, 5))).toBe('LIMIT_EXCEEDED')
  })
})

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

function rels(items: [string, string, string, boolean][]): string {
  const body = items
    .map(([id, type, target, ext]) => `<Relationship Id="${id}" Type="${RNS}/${type}" Target="${target}"${ext ? ' TargetMode="External"' : ''}/>`)
    .join('')
  return `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`
}

function doc(body: string, relItems: [string, string, string, boolean][] = [], media: { name: string; data: Uint8Array }[] = []): Uint8Array {
  return writeZip([
    { name: '_rels/.rels', data: rels([['rId1', 'officeDocument', 'word/document.xml', false]]) },
    { name: 'word/document.xml', data: `${DECL}<w:document xmlns:w="${W}" xmlns:r="${RNS}" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><w:body>${body}</w:body></w:document>` },
    ...(relItems.length ? [{ name: 'word/_rels/document.xml.rels', data: rels(relItems) }] : []),
    ...media,
  ])
}

describe('readDocx structural edge cases', () => {
  it('walks w:ins, w:moveTo and w:customXml blocks in order', () => {
    const bytes = doc(
      `<w:ins><w:p><w:r><w:t>a</w:t></w:r></w:p></w:ins>` +
        `<w:customXml w:uri="urn:x"><w:p><w:r><w:t>b</w:t></w:r></w:p></w:customXml>` +
        `<w:moveTo><w:p><w:r><w:t>c</w:t></w:r></w:p></w:moveTo>`,
    )
    expect(readDocx(bytes).paragraphs.map(p => p.text)).toEqual(['a', 'b', 'c'])
  })

  it('reads rows and cells wrapped in w:customXml', () => {
    const bytes = doc(`<w:tbl><w:customXml w:uri="urn:x"><w:tr><w:tc><w:p><w:r><w:t>cell</w:t></w:r></w:p></w:tc></w:tr></w:customXml></w:tbl>`)
    expect(readDocx(bytes).tables[0].rows[0].cells[0].text).toBe('cell')
  })

  it('finds images inside mc:AlternateContent and skips missing parts', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const body =
      `<w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing>` +
      `<a:graphic><a:graphicData><a:blip r:embed="rIdI"/></a:graphicData></a:graphic>` +
      `</w:drawing></mc:Choice></mc:AlternateContent></w:r></w:p>` +
      `<w:p><w:r><w:drawing><a:graphic><a:graphicData><a:blip r:embed="rIdM"/></a:graphicData></a:graphic></w:drawing></w:r></w:p>`
    const bytes = doc(body, [['rIdI', 'image', 'media/here.png', false], ['rIdM', 'image', 'media/missing.png', false]], [
      { name: 'word/media/here.png', data: png },
    ])
    const d = readDocx(bytes)
    expect(d.images).toHaveLength(1)
    expect(d.images[0].name).toBe('word/media/here.png')
  })

  it('drops runs that are neither text nor image', () => {
    const bytes = doc(`<w:p><w:r><w:b/><w:i/></w:r><w:r><w:t>kept</w:t></w:r></w:p>`)
    expect(readDocx(bytes).paragraphs[0].runs).toEqual([{ text: 'kept' }])
  })
})

describe('renderHTML list edge cases', () => {
  const p = (text: string, level: number, ordered: boolean) => ({
    type: 'paragraph' as const,
    paragraph: { text, runs: [{ text }], list: { numId: '1', level, ordered } },
  })
  const render = (blocks: ReturnType<typeof p>[]) => renderHTML({ paragraphs: [], tables: [], blocks, images: [], metadata: {} })

  it('opens intermediate lists for skipped levels and closes everything', () => {
    const html = render([p('a', 0, false), p('a1', 1, true), p('b', 0, true), p('deep', 3, false)])
    expect(html).toContain('<ul>')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>deep</li>')
    // the outermost list still open at the end is the ordered one opened for "b"
    expect(html.endsWith('</ol>\n')).toBe(true)
  })

  it('switches list type at the same level', () => {
    expect(render([p('a', 0, false), p('n', 0, true)])).toBe('<ul>\n<li>a</li>\n</ul>\n<ol>\n<li>n</li>\n</ol>\n')
  })
})

describe('DocxBuilder option handling', () => {
  it('normalises colours with # and keeps half-point sizes', () => {
    const bytes = new DocxBuilder().addParagraph('x', { color: '#ab12cd', fontSize: 10.5 }).toDocx()
    const d = readDocx(bytes)
    expect(d.paragraphs[0].runs[0]).toMatchObject({ color: '#AB12CD', fontSize: 10.5 })
  })

  it('drops invalid metadata dates and keeps valid ones', () => {
    const bytes = new DocxBuilder()
      .setMetadata({ created: new Date('not-a-date'), modified: new Date('2026-01-02T03:04:05Z') })
      .addParagraph('x')
      .toDocx()
    const d = readDocx(bytes)
    expect(d.metadata.created).toBeUndefined()
    expect(d.metadata.modified).toEqual(new Date('2026-01-02T03:04:05Z'))
  })
})
