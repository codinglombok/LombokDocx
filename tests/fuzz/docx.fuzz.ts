/**
 * Fuzz test — LombokDocx XML parser and package reader
 *
 * Targets: `new XMLParser(xml).parse()` and `readDocx(bytes)` + `renderHTML`.
 * Errors of type DocxError are the documented failure mode; any other
 * exception, a hang, or a crash is a finding.
 *
 * Jalankan:
 *   npm run fuzz
 */
import { LombokFuzzer, FuzzMode, HarnessMode, FuzzEvent } from 'lombokfuzzer'
import { XMLParser, DocxError, readDocx, renderHTML, DocxBuilder } from '../../dist/index.js'

const fuzzer = new LombokFuzzer({
  name: "lombokdocx",
  mode: FuzzMode.Mutation,
  maxExecutions: Number(process.env.FUZZ_EXECUTIONS ?? 50_000),
  maxInputSize: 64 * 1024,
  timeoutMs: 1_000, // ketat — parser ini punya jalur O(n²) yang dicurigai
  harness: {
    mode: HarnessMode.InProcess,
    targetFunction: (data: Uint8Array) => {
      // Documented failures are DocxError with a code; anything else is a bug.
      try {
        new XMLParser(Buffer.from(data).toString('utf-8')).parse()
      } catch (e) {
        if (!(e instanceof DocxError)) throw e
      }
      try {
        renderHTML(readDocx(data, { maxTotalSize: 8 * 1024 * 1024 }))
      } catch (e) {
        if (!(e instanceof DocxError)) throw e
      }
    },
  },
})

// Seed corpus — potongan WordprocessingML nyata + kasus tepi XML.
const seeds = [
  '<w:document><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>',
  '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Title</w:t></w:r></w:p>',
  '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
  '<a self-closing="true"/>',
  '<unclosed><tag>',
  '<a><b><c><d><e><f></f></e></d></c></b></a>', // nested wajar
  '<ns:tag xmlns:ns="urn:x">text</ns:tag>', // namespace
  '<a attr1="val1" attr2="val2" attr3="val3">content</a>',
  '<a></a><b></b>', // multiple root siblings (tanpa root tunggal)
  '<a>text before <b>nested</b> text after</a>',
]

// Tambahan: nested tag makin dalam untuk memicu jalur rekursif/stack
for (const depth of [50, 200, 1000]) {
  const open = '<a>'.repeat(depth)
  const close = '</a>'.repeat(depth)
  seeds.push(open + close)
}

for (const s of seeds) {
  fuzzer.addSeed(new TextEncoder().encode(s))
}
// Whole .docx packages so mutations also exercise the ZIP reader and inflate.
fuzzer.addSeed(
  new DocxBuilder()
    .setMetadata({ title: 'Seed' })
    .addParagraph('Heading', { heading: 1 })
    .addParagraph('Body text', { bold: true, align: 'center' })
    .addTable([['a', 'b'], ['c', 'd']])
    .toDocx(),
)

fuzzer.on(FuzzEvent.CrashFound, ({ crash }) => {
  console.error(
    `[CRASH] ${crash.id} — ${crash.category} (${crash.severity})` +
      (crash.isDuplicate ? ' [duplicate]' : ''),
  )
  const preview = Buffer.from(crash.input.data).toString('utf-8').slice(0, 200)
  console.error(`  input: ${JSON.stringify(preview)}`)
})

fuzzer.on(FuzzEvent.TimeoutFound, ({ input }) => {
  const preview = Buffer.from(input.data).toString('utf-8').slice(0, 200)
  console.error(`[HANG] input yang bikin timeout: ${JSON.stringify(preview)}`)
})

async function main() {
  console.log('Fuzzing LombokDocx...\n')
  const stats = await fuzzer.run()

  console.log(`\nExecutions   : ${stats.totalExecutions}`)
  console.log(`Exec/sec     : ${Math.round(stats.execsPerSecond)}`)
  console.log(`Corpus size  : ${stats.corpusSize}`)
  console.log(`Unique crashes : ${stats.uniqueCrashes}`)
  console.log(`Unique hangs   : ${stats.uniqueTimeouts}`)

  if (stats.uniqueCrashes > 0 || stats.uniqueTimeouts > 0) {
    console.error('\nFuzzing menemukan crash/hang — lihat detail di atas dan folder ./crashes')
    process.exit(1)
  }
  console.log('\nTidak ada crash ditemukan.')
}

main().catch((err) => {
  console.error('Fuzz runner gagal:', err)
  process.exit(1)
})
