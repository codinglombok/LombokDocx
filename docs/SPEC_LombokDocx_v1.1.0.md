# LombokDocx — SPEC v1.1.0

This document is the normative cross-language contract. Every language port MUST produce byte-identical output for all specified inputs. Deviations from this specification are bugs.

| Attribute | Value |
|---|---|
| SPEC version | 1.1.0 (applies to `lombokdocx` 1.1.x) |
| Reference standards | ECMA-376 5th edition / ISO/IEC 29500-1:2016 (WordprocessingML, transitional and strict), ISO/IEC 29500-2 (Open Packaging Conventions), PKWARE APPNOTE 6.3.10 (ZIP), RFC 1951 (DEFLATE), XML 1.0 5th edition, WHATWG HTML Living Standard (reviewed 2026-10-01) |
| Vectors | `vectors/lombokdocx-vectors-v1.json` — 163 cases (docx 81, xml 35, inflate 30, zip 17) — SHA-256 `592c1ad71ebc33654501dd7aed7acb91f6c8c24f66cd64e257c92ffab0169176` |
| Vector oracle | inflate and zip: expected bytes are the original inputs; streams are produced by the deterministic pure-Python encoder in `vectors/build_vectors.py` and verified against Python `zlib` at generation time. xml and docx: expected values written by hand |
| Reference implementation | TypeScript (`src/`) |
| Review date | 2026-10-31 |

The words MUST, MUST NOT, SHOULD, MAY follow RFC 2119.

## 1. Errors

| Code | Raised when |
|---|---|
| `INVALID_ZIP` | broken ZIP structure (no EOCD, bad header, data outside the file) |
| `UNSUPPORTED_ZIP` | ZIP64, multi-disk, encrypted entries, compression methods other than 0 (stored) and 8 (deflate) |
| `CORRUPT_DATA` | invalid DEFLATE stream, size or CRC-32 mismatch |
| `LIMIT_EXCEEDED` | entry-count, entry-size, total-size, inflate-output or XML-depth limit exceeded |
| `INVALID_XML` | XML not well-formed, DTD/declarations, unknown entities |
| `MISSING_PART` | main document part missing, or not a `w:document` with a `w:body` |

Ports MUST expose exactly the codes above. Message text MAY differ.

## 2. Packaging

### 2.1 Inflate

The decoder MUST follow RFC 1951 (stored blocks, fixed Huffman, dynamic Huffman). The following conditions MUST raise `CORRUPT_DATA`: data ends before the final block completes, block type 3, LEN != ~NLEN, over-subscribed or invalid Huffman codes, length symbols 286-287 or distance symbols 30-31, a distance beyond the output produced so far, a length code 16 without a previous length, a missing end-of-block code. Output beyond `maxSize` MUST raise `LIMIT_EXCEEDED`. Bytes after the final block are ignored.

### 2.2 ZIP

1. The EOCD is searched backwards from the end of the file, at most 65 535 + 22 bytes.
2. `0xFFFF`/`0xFFFFFFFF` values in the entry count, sizes, or offsets indicate ZIP64 and MUST be rejected (`UNSUPPORTED_ZIP`). A disk number other than 0 is also rejected.
3. Entries are read from the central directory in stored order. Names are decoded as UTF-8. When a name is duplicated, the first entry wins.
4. Reading an entry: check the encryption flag (bit 0) and the method, then the `maxEntrySize` and `maxTotalSize` limits (accumulating entries already read), then the local header (signature, name + extra length to locate the data). The size and CRC-32 from the central directory MUST match the decompressed data.
5. Default limits: 10 000 entries, 100 MiB per entry, 256 MiB total.

### 2.3 ZIP writer

`writeZip` MUST write stored entries, version 20, flag 0x0800 (UTF-8), DOS time 0 and date 0x21 (1980-01-01), with no extra fields and no comments, so that equal input produces equal bytes.

## 3. XML

1. When a part starts with a UTF-16 BOM (LE `FF FE`, BE `FE FF`), the part is decoded as UTF-16; otherwise UTF-8. A leading U+FEFF BOM is removed.
2. CR LF and lone CR are normalised to LF before parsing (XML 1.0 §2.11).
3. XML declarations, processing instructions, and comments are ignored. `<!DOCTYPE` or any other `<!` declaration MUST be rejected (`INVALID_XML`) — this prevents XXE and entity expansion.
4. Only `&lt; &gt; &amp; &quot; &apos;` and numeric character references for characters allowed by XML 1.0 are resolved; anything else is `INVALID_XML`.
5. Attribute values: literal TAB and LF become spaces; characters from numeric references are preserved. Duplicate attributes, unquoted values, and `<` in a value are `INVALID_XML`.
6. Adjacent text and CDATA merge into one text node; whitespace is preserved as written. Non-whitespace text outside the root element, `]]>` in text, more than one root, and unbalanced tags are `INVALID_XML`.
7. An element opened deeper than `maxDepth` (default 256) raises `LIMIT_EXCEEDED`; self-closing elements do not add depth.
8. Result: `{name, attributes, children}` with qualified names as written.

### 3.1 Namespaces

Before the WordprocessingML mapping, element and attribute names are rewritten to canonical prefixes by their namespace URI: `w` (WordprocessingML transitional and strict), `r`, `a`, `v`, `mc`, `rel`, `cp`, `dc`, `dcterms`, `ep`. Prefix-less elements use the default namespace. Prefix-less attributes have no namespace. Prefixes whose URI is unknown are left as written.

## 4. WordprocessingML mapping

### 4.1 Parts

1. The main part = the relationship of type `.../officeDocument` in `_rels/.rels`; when absent, `word/document.xml`. A missing main part, or a root that is not `w:document` with a `w:body` child, raises `MISSING_PART`.
2. Relationships for part X are read from `<dir>/_rels/<name>.rels`. Internal targets are resolved against X's directory (`..` and `.` normalised, a leading `/` means package root). `TargetMode="External"` targets are stored as written.
3. Styles and numbering are found through the `.../styles` and `.../numbering` relationships of the main part.

### 4.2 Blocks

Children of `w:body` (and of table cells) are processed in order: `w:p` becomes a paragraph, `w:tbl` a table, `w:sdt` is processed through `w:sdtContent`, `w:customXml`/`w:ins`/`w:moveTo` through their children, `mc:AlternateContent` through its first `mc:Choice` (or `mc:Fallback` when there is no Choice). Other elements (including `w:sectPr`) are ignored.

### 4.3 Paragraphs

1. `style` = `w:pPr/w:pStyle/@w:val`.
2. `heading` = n when the style name (from styles) matches `heading n` (case-insensitive, n = 1-9). When the style is not in styles (or there is no styles part), a style id matching `Heading<n>` (case-insensitive) is used.
3. Lists: `numId` and `ilvl` come from `w:pPr/w:numPr`; when either is missing it is inherited through the style chain (`w:basedOn`, at most 16 hops). `numId` "0" means not a list. `ilvl` outside 0-8 is treated as 0. `ordered` = the level's format (`w:num` to `w:abstractNum`) exists and is not `bullet` or `none`.
4. `formatting.align` from `w:jc`: `left`/`start` = left, `center`, `right`/`end` = right, `both`/`distribute` = justify; other values are ignored.
5. `text` = the concatenated run text (after the merging of §4.4).

### 4.4 Runs

1. Within a paragraph: `w:r` is processed; `w:hyperlink` gives `href` to the runs inside it (external target from `r:id`, or `#` + `w:anchor`; an unknown or internal relationship gives no href); `w:ins`, `w:moveTo`, `w:smartTag`, `w:customXml`, `w:fldSimple`, `w:dir`, `w:bdo`, `w:sdt/w:sdtContent`, `mc:AlternateContent` are processed through their contents; `w:del` and `w:moveFrom` are dropped.
2. Run content: `w:t` (text as written), `w:tab`/`w:ptab` = TAB, `w:br`/`w:cr` = LF, `w:noBreakHyphen` = U+2011, `w:softHyphen` = U+00AD. `w:delText` and `w:instrText` are dropped (field results remain readable). Images: `r:embed` on the first `a:blip`, or `r:id` on `v:imagedata`, inside `w:drawing`/`w:pict`/`w:object`/`mc:AlternateContent` (wide search).
3. A run with no text and no image is dropped.
4. Formatting (when `preserveFormatting` is not `false`) comes from `w:rPr` directly, without style inheritance: `bold` (`w:b`), `italic` (`w:i`), `strike` (`w:strike` or `w:dstrike`) are true when the element exists and `w:val` is not `0`/`false`/`off`; `underline` when `w:u` exists and `w:val` is not `none`; `color` = `#` + 6 upper-case hex digits (otherwise ignored, including `auto`); `fontSize` = `w:sz` / 2 for positive integers.
5. Adjacent runs without images whose formatting attributes and `href` are all equal MUST be merged.

### 4.5 Tables

1. Rows `w:tr` (also inside `w:sdt`/`w:customXml`), cells `w:tc` (likewise).
2. Each cell occupies grid columns from the current position, `w:gridSpan` wide (an integer > 1, otherwise 1); `colSpan` is written only when > 1.
3. `w:vMerge` without `w:val`, or with `continue`: when the cell's starting column has an active `restart` cell, that cell's `rowSpan` grows by 1 and this cell is dropped; otherwise the cell is ordinary. A written cell deactivates the active merge on all columns it occupies; a `restart` cell then becomes active at its starting column. `rowSpan` is written only when > 1.
4. Cell content is processed as blocks (§4.2); `paragraphs` = direct paragraphs, `tables` = nested tables (written only when present); `text` = the cell's block texts joined by LF.
5. `width` = `w:tblPr/w:tblW/@w:w` only when `w:type="dxa"` and an integer.

### 4.6 Images

When `extractImages` is not `false`: for every image id in first-occurrence order, the internal relationship of type `.../image` is read; missing parts are skipped. `type` comes from the extension: png, jpg/jpeg/jpe, gif, bmp, tif/tiff, webp, svg, emf, wmf; anything else `application/octet-stream`.

### 4.7 Metadata

When `extractMetadata` is not `false`. From the core part (relationship `.../metadata/core-properties`, default `docProps/core.xml`): `title` (dc:title), `subject`, `author` (dc:creator), `keywords` (cp:keywords split on `,` or `;`, stripped, empties dropped), `description`, `lastModifiedBy`, `created`/`modified` (dcterms; only `YYYY-MM-DD` or `YYYY-MM-DDThh:mm[:ss[.f]][Z|±hh:mm]` shapes with a valid date). From the app part (relationship `.../extended-properties`, default `docProps/app.xml`): `pageCount` (Pages), `wordCount` (Words), `characterCount` (Characters), non-negative integers only. Text is stripped (SPACE, TAB, LF); empty values are not written. In vectors, dates are written ISO 8601 UTC with milliseconds.

## 5. Text

`documentToText` = the text of every block joined by LF; table text = cells joined by TAB, rows joined by LF.

## 6. HTML

1. When `includeTitle` is not `false` and `metadata.title` exists: `<h1>{esc(title)}</h1>\n`.
2. Non-list paragraph: `<{tag}{style}>{runs}</{tag}>\n`; `tag` = `h{min(heading,6)}` when a heading exists, otherwise `p`; `style` = ` style="text-align: {align}"` when align exists and is not `left`.
3. Runs: `esc(text)` with LF turned into `<br>`, then wrapped in order `<strong>`, `<em>`, `<u>`, `<s>`, `<span style="color: #RRGGBB">`, `<a href="{esc(href)}">`. Links only when the href starts with `#`, `http:`, `https:`, or `mailto:` (case-insensitive); otherwise text without a link. Images (when `embedImages` is not `false`) are appended after the text as `<img src="data:{type};base64,{data}" alt="">` only for png, jpeg, gif, webp, bmp; SVG and other formats are omitted.
4. Lists (paragraphs with `list`): a stack of open lists; every stack entry always has an open `<li>`. For an item at level L with tag T (`ol` when ordered, otherwise `ul`), d = L + 1: close `</li>\n</X>\n` while the stack is deeper than d; when the stack equals d and the top tag matches, write `</li>\n`; when it differs, write `</li>\n</X>\n<T>\n` and replace the top tag; when the stack is shallower than d, open `<T>\n<li>` for intermediate levels and `<T>\n` for level d. Then write `<li>{runs}`. Non-list blocks and the end of the document close all lists.
5. Tables: `<table>\n`, per row `<tr>\n`, per cell `<td{colspan}{rowspan}>{content}</td>\n`, `</tr>\n`, `</table>\n`; content = the cell's paragraph runs joined by `<br>`, followed by nested tables.
6. `esc` replaces `&`, `<`, `>`, `"`, `'` with `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`.

## 7. DOCX writer (`DocxBuilder.toDocx`)

The package contains, in order: `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`, `word/styles.xml`, `docProps/core.xml`, written as in §2.3. Characters not allowed in XML 1.0 are dropped. Two adjacent tables are separated by an empty paragraph. Reading the result back MUST produce the same text, headings, alignment, run formatting, tables, and metadata. Builder options that fail validation (heading outside 1-9, a colour that is not 6 hex digits, a non-positive font size) are ignored.

## 8. Security (normative)

1. No DTDs, external entities, or entity expansion (§3.3).
2. All decompression is bounded by the declared sizes and global limits (§2.2), so ZIP bombs stop before large allocations.
3. The XML parser is iterative with a depth limit; there is no unbounded recursion on input.
4. HTML output escapes all text, blocks URL schemes outside the allow-list, and never embeds SVG.
5. The library writes no files and never uses a ZIP entry name as a file-system path.

## 9. Changes from 1.0.0

1.0.0 did not read DOCX files at all (`extract()` always returned empty). 1.1.0 adds all reading (§2-§5), replaces the XML parser (the old one trimmed whitespace, mishandled entities, and ran quadratically), adds `blocks`, `DocxError`, the DOCX writer, and changes `DocxImage.data` from `Buffer` to `Uint8Array` and drops `base64`.

### 9.1 Vector regeneration

`python3 vectors/build_vectors.py` rewrites the vector file deterministically (pure-Python DEFLATE encoder; every stream is verified against the system zlib at generation time, and the script aborts on any mismatch). CI regenerates the file and fails on any `git diff` plus a `sha256sum -c vectors/SHA256SUMS` check. After adding or editing cases, refresh `vectors/SHA256SUMS` and the hash in the table above.

*Document licence: Apache-2.0 · © codinglombok*
