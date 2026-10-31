# LombokDocx — Language & i18n v1.1.0

| Attribute | Value |
|---|---|
| i18n level (masterplan §13) | **E** — error codes and documentation |
| Message catalogue | no `locales/` yet; IDs reserved in §2 |
| Current catalogue coverage | en + id (2/20); Nusantara 0/6 |

## 1. Principles

1. Errors carry a stable `code` (SPEC §1); programs MUST check `code`.
2. Document text in any script (Latin, Arabic, CJK, Nusantara scripts, emoji) is preserved without normalisation. UTF-8 and UTF-16 XML parts are supported.
3. Heading style names are recognised from Word's built-in style names (`heading 1` ... `heading 9`), so documents with localised style ids (for example `Judul1`) still read as headings as long as the styles part exists.
4. Text direction (RTL) from `w:bidi`/`w:rtl` is not read yet; the HTML output does not set `dir`.

## 2. Reserved message IDs

| ID | Code | en | id |
|---|---|---|---|
| `lombokdocx.zip.invalid` | `INVALID_ZIP` | The file is not a valid ZIP archive. | Berkas bukan arsip ZIP yang sah. |
| `lombokdocx.zip.unsupported` | `UNSUPPORTED_ZIP` | Unsupported ZIP feature: {$feature}. | Fitur ZIP tidak didukung: {$feature}. |
| `lombokdocx.data.corrupt` | `CORRUPT_DATA` | Compressed data is corrupt. | Data terkompresi rusak. |
| `lombokdocx.limit.exceeded` | `LIMIT_EXCEEDED` | Limit exceeded: {$limit}. | Batas terlampaui: {$limit}. |
| `lombokdocx.xml.invalid` | `INVALID_XML` | Invalid XML in {$part}. | XML tidak sah di {$part}. |
| `lombokdocx.part.missing` | `MISSING_PART` | Required part is missing: {$part}. | Part wajib tidak ada: {$part}. |

## 3. Plan

A `locales/en` and `locales/id` catalogue (loaded through LombokLocale as an optional dependency), plus `dir="rtl"` for `w:bidi` paragraphs.

*Document licence: Apache-2.0 · © codinglombok*
