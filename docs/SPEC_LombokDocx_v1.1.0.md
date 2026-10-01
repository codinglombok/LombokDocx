# LombokDocx — SPEC v1.1.0

This document is the normative cross-language contract. Every language port MUST produce byte-identical output for all specified inputs. Deviations from this specification are bugs.

| Atribut | Nilai |
|---|---|
| Versi SPEC | 1.1.0 (berlaku untuk paket `lombokdocx` 1.1.x) |
| Standar acuan | ECMA-376 edisi ke-5 / ISO/IEC 29500-1:2016 (WordprocessingML, transitional dan strict), ISO/IEC 29500-2 (Open Packaging Conventions), PKWARE APPNOTE 6.3.10 (ZIP), RFC 1951 (DEFLATE), XML 1.0 edisi ke-5, WHATWG HTML Living Standard (tinjauan 2026-10-01) |
| Vector | `vectors/lombokdocx-vectors-v1.json` — 163 kasus (docx 81, xml 35, inflate 30, zip 17) — SHA-256 `f959c7cd58b273803e49a6e55ff9742f2b27f6f69e27d183079b8320fa63edea` |
| Oracle vector | inflate dan zip: Python `zlib` / `zipfile`; xml dan docx: nilai harapan ditulis tangan |
| Referensi | TypeScript (`src/`) |
| Tanggal tinjauan | 2026-10-01 |

Kata MUST, MUST NOT, SHOULD, MAY mengikuti RFC 2119.

## 1. Error

| Kode | Kapan |
|---|---|
| `INVALID_ZIP` | struktur ZIP rusak (EOCD tidak ada, header salah, data di luar berkas) |
| `UNSUPPORTED_ZIP` | ZIP64, multi-disk, entri terenkripsi, metode kompresi selain 0 (stored) dan 8 (deflate) |
| `CORRUPT_DATA` | aliran DEFLATE tidak sah, ukuran atau CRC-32 tidak cocok |
| `LIMIT_EXCEEDED` | batas jumlah entri, ukuran entri, ukuran total, panjang keluaran inflate, atau kedalaman XML terlampaui |
| `INVALID_XML` | XML tidak well-formed, DTD/deklarasi, entitas tak dikenal |
| `MISSING_PART` | part dokumen utama tidak ada atau bukan `w:document` dengan `w:body` |

Port MUST mengekspos kode persis di atas. Teks pesan MAY berbeda.

## 2. Kemasan

### 2.1 Inflate

Dekoder MUST mengikuti RFC 1951 (blok stored, Huffman tetap, Huffman dinamis). Kondisi berikut MUST menghasilkan `CORRUPT_DATA`: data berakhir sebelum blok final selesai, tipe blok 3, LEN != ~NLEN, kode Huffman over-subscribed atau tidak sah, simbol panjang 286-287 atau jarak 30-31, jarak melebihi keluaran yang sudah ada, kode panjang 16 tanpa panjang sebelumnya, tidak ada kode end-of-block. Keluaran yang melebihi `maxSize` MUST menghasilkan `LIMIT_EXCEEDED`. Byte setelah blok final diabaikan.

### 2.2 ZIP

1. EOCD dicari mundur dari akhir berkas, paling jauh 65 535 + 22 byte.
2. Nilai `0xFFFF`/`0xFFFFFFFF` pada jumlah entri, ukuran, atau offset menandakan ZIP64 dan MUST ditolak (`UNSUPPORTED_ZIP`). Nomor disk bukan 0 juga ditolak.
3. Entri dibaca dari central directory dalam urutan tersimpan. Nama didekode sebagai UTF-8. Bila nama ganda, entri pertama yang dipakai.
4. Membaca entri: periksa enkripsi (bit 0 flag) dan metode, lalu batas `maxEntrySize` dan `maxTotalSize` (akumulasi entri yang sudah dibaca), lalu header lokal (signature, panjang nama + extra untuk menemukan data). Ukuran dan CRC dari central directory MUST sama dengan data hasil dekompresi.
5. Batas bawaan: 10 000 entri, 100 MiB per entri, 256 MiB total.

### 2.3 Penulis ZIP

`writeZip` MUST menulis entri stored, versi 20, flag 0x0800 (UTF-8), waktu DOS 0 dan tanggal 0x21 (1980-01-01), tanpa extra field dan komentar, sehingga masukan sama menghasilkan byte sama.

## 3. XML

1. Bila byte part diawali BOM UTF-16 (LE `FF FE`, BE `FE FF`), part didekode sebagai UTF-16; selain itu UTF-8. BOM U+FEFF di awal dibuang.
2. CR LF dan CR tunggal dinormalisasi menjadi LF sebelum parsing (XML 1.0 §2.11).
3. Deklarasi XML, processing instruction, dan komentar diabaikan. `<!DOCTYPE` atau deklarasi `<!` lain MUST ditolak (`INVALID_XML`) — ini mencegah XXE dan ledakan entitas.
4. Referensi yang diselesaikan hanya `&lt; &gt; &amp; &quot; &apos;` dan referensi karakter numerik untuk karakter yang diizinkan XML 1.0; lainnya `INVALID_XML`.
5. Nilai atribut: TAB dan LF literal diganti spasi; karakter dari referensi numerik dipertahankan. Atribut ganda, nilai tanpa kutip, dan `<` di nilai adalah `INVALID_XML`.
6. Teks dan CDATA yang bersebelahan digabung menjadi satu node teks; whitespace dipertahankan apa adanya. Teks bukan-whitespace di luar elemen root, `]]>` di teks, lebih dari satu root, tag tidak seimbang adalah `INVALID_XML`.
7. Elemen yang membuka di kedalaman lebih dari `maxDepth` (bawaan 256) menghasilkan `LIMIT_EXCEEDED`; elemen self-closing tidak menambah kedalaman.
8. Hasil: `{name, attributes, children}` dengan nama berkualifikasi apa adanya.

### 3.1 Namespace

Sebelum pemetaan WordprocessingML, nama elemen dan atribut ditulis ulang ke prefiks kanonik menurut URI namespace yang berlaku: `w` (WordprocessingML transitional dan strict), `r`, `a`, `v`, `mc`, `rel`, `cp`, `dc`, `dcterms`, `ep`. Elemen tanpa prefiks memakai namespace bawaan. Atribut tanpa prefiks tidak bernamespace. Prefiks yang URI-nya tidak dikenal dibiarkan.

## 4. Pemetaan WordprocessingML

### 4.1 Part

1. Part utama = target relasi bertipe `.../officeDocument` di `_rels/.rels`; bila tidak ada, `word/document.xml`. Part utama yang hilang, atau root yang bukan `w:document` dengan anak `w:body`, menghasilkan `MISSING_PART`.
2. Relasi part X dibaca dari `<dir>/_rels/<nama>.rels`. Target internal di-resolve terhadap direktori X (`..` dan `.` dinormalisasi, `/` di awal berarti akar paket). Target `TargetMode="External"` disimpan apa adanya.
3. Styles dan numbering ditemukan lewat relasi `.../styles` dan `.../numbering` dari part utama.

### 4.2 Blok

Anak `w:body` (dan isi sel tabel) diproses berurutan: `w:p` menjadi paragraf, `w:tbl` menjadi tabel, `w:sdt` diproses lewat `w:sdtContent`, `w:customXml`/`w:ins`/`w:moveTo` diproses anaknya, `mc:AlternateContent` diproses lewat `mc:Choice` pertama (atau `mc:Fallback` bila tidak ada Choice). Elemen lain (termasuk `w:sectPr`) diabaikan.

### 4.3 Paragraf

1. `style` = `w:pPr/w:pStyle/@w:val`.
2. `heading` = n bila nama gaya (dari styles) cocok `heading n` (tidak peka huruf besar, n = 1-9). Bila gaya tidak ada di styles (atau tidak ada part styles), id gaya yang cocok `Heading<n>` (tidak peka huruf besar) dipakai.
3. Daftar: `numId` dan `ilvl` dari `w:pPr/w:numPr`; bila salah satunya tidak ada, diwarisi dari rantai gaya (`w:basedOn`, paling banyak 16 langkah). `numId` "0" berarti bukan daftar. `ilvl` di luar 0-8 dianggap 0. `ordered` = format level itu (`w:num` ke `w:abstractNum`) ada dan bukan `bullet` atau `none`.
4. `formatting.align` dari `w:jc`: `left`/`start` = left, `center`, `right`/`end` = right, `both`/`distribute` = justify; nilai lain diabaikan.
5. `text` = gabungan teks run (setelah penggabungan §4.4).

### 4.4 Run

1. Dalam paragraf: `w:r` diproses; `w:hyperlink` memberi `href` pada run di dalamnya (target eksternal dari `r:id`, atau `#` + `w:anchor`; relasi tidak dikenal atau internal tidak memberi href); `w:ins`, `w:moveTo`, `w:smartTag`, `w:customXml`, `w:fldSimple`, `w:dir`, `w:bdo`, `w:sdt/w:sdtContent`, `mc:AlternateContent` diproses isinya; `w:del` dan `w:moveFrom` dibuang.
2. Isi run: `w:t` (teks apa adanya), `w:tab`/`w:ptab` = TAB, `w:br`/`w:cr` = LF, `w:noBreakHyphen` = U+2011, `w:softHyphen` = U+00AD. `w:delText` dan `w:instrText` dibuang (hasil field tetap terbaca). Gambar: `r:embed` pada `a:blip` pertama, atau `r:id` pada `v:imagedata`, di dalam `w:drawing`/`w:pict`/`w:object`/`mc:AlternateContent` (pencarian melebar).
3. Run tanpa teks dan tanpa gambar dibuang.
4. Format (bila `preserveFormatting` tidak `false`) dari `w:rPr` langsung, tanpa pewarisan gaya: `bold` (`w:b`), `italic` (`w:i`), `strike` (`w:strike` atau `w:dstrike`) bernilai benar bila elemen ada dan `w:val` bukan `0`/`false`/`off`; `underline` bila `w:u` ada dan `w:val` bukan `none`; `color` = `#` + 6 heksadesimal huruf besar (selain itu diabaikan, termasuk `auto`); `fontSize` = `w:sz` / 2 untuk bilangan bulat positif.
5. Run bersebelahan tanpa gambar yang semua atribut formatnya dan `href`-nya sama MUST digabung.

### 4.5 Tabel

1. Baris `w:tr` (juga di dalam `w:sdt`/`w:customXml`), sel `w:tc` (idem).
2. Setiap sel menempati kolom grid mulai dari posisi saat ini sebanyak `w:gridSpan` (bilangan bulat > 1, selain itu 1); `colSpan` hanya ditulis bila > 1.
3. `w:vMerge` tanpa `w:val` atau `continue`: bila kolom awal sel punya sel `restart` yang aktif, `rowSpan` sel itu bertambah 1 dan sel ini dibuang; jika tidak, sel diperlakukan biasa. Sel yang ditulis menonaktifkan merge aktif di semua kolom yang ditempatinya; sel `restart` lalu menjadi aktif di kolom awalnya. `rowSpan` hanya ditulis bila > 1.
4. Isi sel diproses sebagai blok (§4.2); `paragraphs` = paragraf langsung, `tables` = tabel bersarang (hanya ditulis bila ada); `text` = teks blok sel digabung LF.
5. `width` = `w:tblPr/w:tblW/@w:w` hanya bila `w:type="dxa"` dan bilangan bulat.

### 4.6 Gambar

Bila `extractImages` tidak `false`: untuk setiap id gambar dalam urutan kemunculan pertama, relasi internal bertipe `.../image` dibaca; part yang hilang dilewati. `type` dari ekstensi: png, jpg/jpeg/jpe, gif, bmp, tif/tiff, webp, svg, emf, wmf; lainnya `application/octet-stream`.

### 4.7 Metadata

Bila `extractMetadata` tidak `false`. Dari part core (relasi `.../metadata/core-properties`, bawaan `docProps/core.xml`): `title` (dc:title), `subject`, `author` (dc:creator), `keywords` (cp:keywords dipisah `,` atau `;`, di-strip, yang kosong dibuang), `description`, `lastModifiedBy`, `created`/`modified` (dcterms; hanya bentuk `YYYY-MM-DD` atau `YYYY-MM-DDThh:mm[:ss[.f]][Z|±hh:mm]` yang tanggalnya sah). Dari part app (relasi `.../extended-properties`, bawaan `docProps/app.xml`): `pageCount` (Pages), `wordCount` (Words), `characterCount` (Characters), hanya bilangan bulat non-negatif. Teks di-strip (SPACE, TAB, LF); nilai kosong tidak ditulis. Di vector, tanggal ditulis ISO 8601 UTC dengan milidetik.

## 5. Teks

`documentToText` = teks setiap blok digabung LF; teks tabel = sel digabung TAB, baris digabung LF.

## 6. HTML

1. Bila `includeTitle` tidak `false` dan ada `metadata.title`: `<h1>{esc(title)}</h1>\n`.
2. Paragraf bukan daftar: `<{tag}{style}>{runs}</{tag}>\n`; `tag` = `h{min(heading,6)}` bila ada heading, selain itu `p`; `style` = ` style="text-align: {align}"` bila align ada dan bukan `left`.
3. Run: `esc(text)` dengan LF menjadi `<br>`, lalu dibungkus berurutan `<strong>`, `<em>`, `<u>`, `<s>`, `<span style="color: #RRGGBB">`, `<a href="{esc(href)}">`. Tautan hanya bila href diawali `#`, `http:`, `https:`, atau `mailto:` (tidak peka huruf besar); selain itu teks tanpa tautan. Gambar (bila `embedImages` tidak `false`) ditambahkan setelah teks sebagai `<img src="data:{type};base64,{data}" alt="">` hanya untuk png, jpeg, gif, webp, bmp; SVG dan format lain dihilangkan.
4. Daftar (paragraf dengan `list`): tumpukan list terbuka; setiap entri tumpukan selalu punya `<li>` terbuka. Untuk item level L dengan tag T (`ol` bila ordered, selain itu `ul`), d = L + 1: tutup `</li>\n</X>\n` selama tumpukan > d; bila tumpukan = d dan tag teratas sama, tulis `</li>\n`; bila berbeda, tulis `</li>\n</X>\n<T>\n` dan ganti tag teratas; bila tumpukan < d, buka `<T>\n<li>` untuk level perantara dan `<T>\n` untuk level d. Lalu tulis `<li>{runs}`. Blok bukan daftar dan akhir dokumen menutup semua list.
5. Tabel: `<table>\n`, per baris `<tr>\n`, per sel `<td{colspan}{rowspan}>{isi}</td>\n`, `</tr>\n`, `</table>\n`; isi = runs setiap paragraf sel digabung `<br>`, diikuti tabel bersarang.
6. `esc` mengganti `&`, `<`, `>`, `"`, `'` dengan `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`.

## 7. Penulis DOCX (`DocxBuilder.toDocx`)

Paket berisi, berurutan: `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`, `word/styles.xml`, `docProps/core.xml`, ditulis dengan §2.3. Karakter yang tidak sah di XML 1.0 dibuang. Dua tabel bersebelahan dipisah paragraf kosong. Membaca kembali hasilnya MUST menghasilkan teks, heading, perataan, format run, tabel, dan metadata yang sama.

## 8. Keamanan (normatif)

1. Tidak ada DTD, entitas eksternal, atau ekspansi entitas (§3.3).
2. Semua dekompresi dibatasi ukuran yang dinyatakan dan batas global (§2.2), sehingga bom ZIP dihentikan sebelum alokasi besar.
3. Parser XML iteratif dengan batas kedalaman; tidak ada rekursi tak terbatas pada masukan.
4. Keluaran HTML meng-escape semua teks, memblokir skema URL selain yang diizinkan, dan tidak menyematkan SVG.
5. Pustaka tidak menulis berkas dan tidak pernah memakai nama entri ZIP sebagai path sistem berkas.

## 9. Perubahan dari 1.0.0

1.0.0 tidak membaca berkas DOCX sama sekali (`extract()` selalu kosong). 1.1.0 menambahkan seluruh pembacaan (§2-§5), mengganti parser XML (yang lama memotong spasi, tidak menangani entitas, dan berjalan kuadratik), menambah `blocks`, `DocxError`, penulis DOCX, serta mengubah `DocxImage.data` dari `Buffer` menjadi `Uint8Array` dan menghapus `base64`.

*Lisensi dokumen: Apache-2.0 · © codinglombok*
