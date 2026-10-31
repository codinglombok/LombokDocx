# LombokDocx — Full Summary Project v1.1.0

| Item | Value |
|---|---|
| Description | Read and write .docx files without dependencies: text, headings, lists, tables with merges, hyperlinks, images, metadata, safe HTML output |
| Cluster · level | 03.08 · L0 |
| Reference implementation | TypeScript, about 1 650 lines in `src/` |
| Ports | Python, Go, PHP: stubs |
| Vectors | 163 cases · SHA-256 `592c1ad7...0169176` · deterministic generator, streams verified against Python zlib at generation time |
| Tests | 230 (67 unit/edge + 163 vectors) · coverage statements 97.1%, branches 92.7%, lines 99.2% |
| Mutation testing | 17 mutants: 14 killed directly, 3 survived then closed with new vectors, 1 equivalent |
| Fuzzing | lombokfuzzer (XML + DOCX packages), runs in CI with 100 000 executions without crash/hang |
| Cross-verification | files produced by python-docx 1.1.2 read correctly; `toDocx()` output reads correctly in python-docx |
| Registry | npm `lombokdocx` (not yet published) |
| Licence | Apache-2.0 |

## 1. Honest gap table against peers

| Capability | LombokDocx 1.1.0 | mammoth.js | docx (npm) | python-docx |
|---|---|---|---|---|
| Read text, headings, lists, tables | YES | YES | NO (write only) | YES |
| Cell merges (gridSpan, vMerge) | YES | partial | YES (write) | YES |
| Hyperlinks, images | YES | YES | YES (write) | partial |
| Core/app metadata | YES | NO | YES (write) | YES |
| Headers, footers, footnotes, comments | NO | footnotes | YES (write) | headers/footers |
| Format inheritance from character/paragraph styles | NO (headings and numbering only) | YES (style map) | — | YES |
| Write DOCX | YES (basic: paragraphs, headings, formatting, tables, metadata) | NO | YES (full) | YES (full) |
| Runtime dependencies | 0 | 2+ (JSZip, ...) | several | lxml |
| ZIP-bomb limits / safe XML | YES, normative | not stated | — | depends on lxml |
| Cross-language contract (SPEC + vectors) | YES | NO | NO | NO |

## 2. Known limitations

1. Only the TypeScript port exists.
2. Headers, footers, endnotes, comments, text boxes, and equations are not read.
3. Style-based formatting (for example a "Strong" character style) is not inherited; only direct formatting in `w:rPr` applies. Headings and numbering are inherited from styles.
4. ZIP64, multi-disk archives, encrypted entries, and methods other than stored/deflate are rejected. `.doc` (old binary) is not read; `.docm` macros are never executed.
5. List numbering is not computed (numbers are not written into the text); HTML uses `<ol>`/`<ul>`.
6. RTL text direction is not read.
7. The 1.0.0 claims ("full style fidelity", "comment & tracked-changes extraction", "list/numbering reconstruction", "robust handling of malformed archives", "memory efficient streaming", performance figures) were never implemented; corrected in the 1.1.0 CHANGELOG.
8. The whole file is read into memory; there is no streaming.

## 3. Universal principles (public summary)

| Principle | Status | Evidence |
|---|---|---|
| U1 Standalone | YES | README free of application-ownership claims; neutral scenarios in guide §5 |
| U2 Modern | YES | SPEC: ECMA-376 ed. 5 / ISO/IEC 29500:2016, APPNOTE 6.3.10, RFC 1951, XML 1.0 ed. 5 |
| U3 Multi-platform | PARTIAL | pure TS; Node/Deno/Bun/browser via `readDocx(bytes)`; CI on 3 OSes |
| U4 Multi-language | PARTIAL | TS runner only; other ports are stubs |
| U5 Scale range | PARTIAL | 0 dependencies; configurable limits; no streaming |
| U6 Complete & unique | PARTIAL | gap table |
| U7 Safe & tested | YES | SPEC §8, fuzzing, mutation testing, coverage |
| U8 Ecosystem without coupling | YES | 0 mandatory dependencies |
| U9 International | PARTIAL | Lang_: level E, 2/20 |
| U10 Licence | YES | Apache-2.0 |
| U11 Registry-ready | YES | `npm pack` in CI, tag gate |
| U12 Documentation | YES | 10 public + 2 internal documents |
| U13 Confidentiality & clean documents | YES | doctor |

*Document licence: Apache-2.0 · © codinglombok*
