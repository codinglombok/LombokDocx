/**
 * Vector runner (GP-11): executes every case in vectors/lombokdocx-vectors-v1.json.
 * Objects are compared as JSON with sorted keys; byte outputs as {size, sha256}.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DocxError, ZipReader, documentToText, inflateRaw, parseXML, readDocx, renderHTML, type DocxOptions,
} from '../src/index'

interface Case {
  id: string
  fn: string
  input: string
  expected: any
  call?: string
  name?: string
  readFirst?: string
  limits?: any
  maxSize?: number
  maxDepth?: number
  options?: DocxOptions
}

const doc = JSON.parse(readFileSync(new URL('../vectors/lombokdocx-vectors-v1.json', import.meta.url), 'utf-8')) as { cases: Case[] }

function bytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

function digest(b: Uint8Array) {
  return { size: b.length, sha256: createHash('sha256').update(b).digest('hex') }
}

function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(Object.keys(val).sort().map(k => [k, val[k]]))
    }
    return val
  })
}

function run(c: Case): unknown {
  switch (c.fn) {
    case 'inflate':
      return digest(inflateRaw(bytes(c.input), c.maxSize ?? 0x7fffffff))
    case 'zip': {
      const z = new ZipReader(bytes(c.input), c.limits)
      if (c.call === 'open') return { entries: z.entries.map(e => e.name) }
      if (c.call === 'read') {
        if (c.readFirst) z.read(c.readFirst)
        return z.read(c.name!)
      }
      const read: Record<string, unknown> = {}
      for (const name of Object.keys(c.expected.read)) {
        const b = z.read(name)
        read[name] = b ? digest(b) : null
      }
      return { entries: z.entries.map(e => e.name), read }
    }
    case 'xml':
      return parseXML(c.input, { maxDepth: c.maxDepth })
    case 'docx': {
      const d = readDocx(bytes(c.input), c.options)
      return {
        blocks: d.blocks,
        images: d.images.map(i => ({ id: i.id, name: i.name, type: i.type, ...digest(i.data) })),
        metadata: JSON.parse(JSON.stringify(d.metadata)),
        text: documentToText(d),
        html: renderHTML(d),
      }
    }
    default:
      throw new Error(`unknown fn ${c.fn}`)
  }
}

describe('lombokdocx vectors v1', () => {
  it('has at least 100 cases', () => {
    expect(doc.cases.length).toBeGreaterThanOrEqual(100)
  })
  for (const c of doc.cases) {
    it(c.id, () => {
      if (c.expected && typeof c.expected === 'object' && 'error' in c.expected) {
        let caught: unknown
        try {
          run(c)
        } catch (e) {
          caught = e
        }
        expect(caught, 'expected an error').toBeInstanceOf(DocxError)
        expect((caught as DocxError).code).toBe(c.expected.error)
        return
      }
      expect(canonical(run(c))).toBe(canonical(c.expected))
    })
  }
})
