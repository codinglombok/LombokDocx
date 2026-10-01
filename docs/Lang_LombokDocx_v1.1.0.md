# LombokDocx — Bahasa & i18n v1.1.0

| Atribut | Nilai |
|---|---|
| Tingkat i18n (masterplan §13) | **E** — kode error dan dokumentasi |
| Katalog pesan | belum ada `locales/`; ID dicadangkan di §2 |
| Cakupan katalog saat ini | en + id (2/20); Nusantara 0/6 |

## 1. Prinsip

1. Error membawa `code` stabil (SPEC §1); program MUST memeriksa `code`.
2. Teks dokumen dalam aksara apa pun (Latin, Arab, CJK, aksara Nusantara, emoji) dipertahankan tanpa normalisasi. Part XML UTF-8 dan UTF-16 didukung.
3. Nama gaya heading dikenali dari nama gaya bawaan Word (`heading 1` ... `heading 9`), sehingga dokumen dengan id gaya terlokalisasi (misalnya `Judul1`) tetap terbaca sebagai heading selama part styles ada.
4. Arah teks (RTL) dari `w:bidi`/`w:rtl` belum dibaca; keluaran HTML tidak menetapkan `dir`.

## 2. Katalog ID pesan (dicadangkan)

| ID | Kode | en | id |
|---|---|---|---|
| `lombokdocx.zip.invalid` | `INVALID_ZIP` | The file is not a valid ZIP archive. | Berkas bukan arsip ZIP yang sah. |
| `lombokdocx.zip.unsupported` | `UNSUPPORTED_ZIP` | Unsupported ZIP feature: {$feature}. | Fitur ZIP tidak didukung: {$feature}. |
| `lombokdocx.data.corrupt` | `CORRUPT_DATA` | Compressed data is corrupt. | Data terkompresi rusak. |
| `lombokdocx.limit.exceeded` | `LIMIT_EXCEEDED` | Limit exceeded: {$limit}. | Batas terlampaui: {$limit}. |
| `lombokdocx.xml.invalid` | `INVALID_XML` | Invalid XML in {$part}. | XML tidak sah di {$part}. |
| `lombokdocx.part.missing` | `MISSING_PART` | Required part is missing: {$part}. | Part wajib tidak ada: {$part}. |

## 3. Rencana

Katalog `locales/en` dan `locales/id` (dimuat lewat LombokLocale sebagai dependensi opsional), serta arah teks `dir="rtl"` untuk paragraf `w:bidi`.

*Lisensi dokumen: Apache-2.0 · © codinglombok*
