# LombokDocx — Full Summary Project v1.1.0

| Item | Nilai |
|---|---|
| Deskripsi | Membaca dan menulis berkas .docx tanpa dependensi: teks, heading, daftar, tabel dengan merge, hyperlink, gambar, metadata, keluaran HTML aman |
| Cluster · tingkat | 03.08 · L0 |
| Referensi | TypeScript, sekitar 1 650 baris di `src/` |
| Port | Python, Go, PHP: stub |
| Vector | 163 kasus · SHA-256 `f959c7cd...63edea` · oracle Python zlib/zipfile untuk kemasan |
| Test | 200 (37 unit + 163 vector) · coverage baris 98,7%, cabang 90,6% |
| Uji mutasi | 17 mutan: 14 terbunuh langsung, 3 lolos lalu ditutup dengan vector baru, 1 ekuivalen |
| Fuzz | lombokfuzzer (XML + paket DOCX), 30 000 eksekusi lokal tanpa crash/hang |
| Verifikasi silang | berkas buatan python-docx 1.1.2 terbaca benar; berkas `toDocx()` terbaca benar oleh python-docx |
| Registry | npm `lombokdocx` (belum terbit) |
| Lisensi | Apache-2.0 |

## 1. Tabel gap vs pembanding (jujur)

| Kemampuan | LombokDocx 1.1.0 | mammoth.js | docx (npm) | python-docx |
|---|---|---|---|---|
| Baca teks, heading, daftar, tabel | YA | YA | TIDAK (tulis saja) | YA |
| Merge sel (gridSpan, vMerge) | YA | sebagian | YA (tulis) | YA |
| Hyperlink, gambar | YA | YA | YA (tulis) | sebagian |
| Metadata core/app | YA | TIDAK | YA (tulis) | YA |
| Header, footer, catatan kaki, komentar | TIDAK | catatan kaki | YA (tulis) | header/footer |
| Pewarisan format dari gaya karakter/paragraf | TIDAK (heading dan numbering saja) | YA (style map) | — | YA |
| Tulis DOCX | YA (dasar: paragraf, heading, format, tabel, metadata) | TIDAK | YA (lengkap) | YA (lengkap) |
| Dependensi runtime | 0 | 2+ (JSZip, ...) | beberapa | lxml |
| Batas bom ZIP / XML aman | YA, normatif | tidak dinyatakan | — | bergantung lxml |
| Kontrak lintas bahasa (SPEC + vector) | YA | TIDAK | TIDAK | TIDAK |

## 2. Batasan yang Diketahui

1. Hanya port TypeScript yang ada.
2. Header, footer, catatan kaki/akhir, komentar, kotak teks, dan persamaan tidak dibaca.
3. Format dari gaya (misalnya gaya karakter "Strong") tidak diwariskan; hanya format langsung di `w:rPr`. Heading dan numbering diwariskan dari gaya.
4. ZIP64, arsip multi-disk, entri terenkripsi, dan metode selain stored/deflate ditolak. Berkas `.doc` (biner lama), `.docm` dengan makro tidak dijalankan (makro tidak pernah dieksekusi).
5. Penomoran daftar tidak dihitung (nomor tidak ditulis ke teks); HTML memakai `<ol>`/`<ul>`.
6. Arah teks RTL tidak dibaca.
7. Klaim 1.0.0 ("full style fidelity", "comment & tracked-changes extraction", "list/numbering reconstruction", "robust handling of malformed archives", "memory efficient streaming", angka kinerja) tidak pernah diimplementasikan; dikoreksi di CHANGELOG 1.1.0.
8. Seluruh berkas dibaca ke memori; tidak ada streaming.

## 3. Prinsip Universal (ringkas, untuk publik)

| Prinsip | Status | Bukti |
|---|---|---|
| U1 Mandiri | YA | README bebas klaim; skenario netral di guide_ §5 |
| U2 Modern | YA | SPEC: ECMA-376 ed. 5 / ISO/IEC 29500:2016, APPNOTE 6.3.10, RFC 1951, XML 1.0 ed. 5 |
| U3 Multi-platform | SEBAGIAN | TS murni; Node/Deno/Bun/browser via `readDocx(bytes)`; CI 3 OS |
| U4 Multi-bahasa | SEBAGIAN | runner TS saja; port lain stub |
| U5 Rentang skala | SEBAGIAN | 0 dependensi; batas dapat diatur; tanpa streaming |
| U6 Lengkap & unik | SEBAGIAN | tabel gap |
| U7 Aman & teruji | YA | SPEC §8, fuzz, uji mutasi, coverage |
| U8 Ekosistem tanpa kopling | YA | 0 dependensi wajib |
| U9 Internasional | SEBAGIAN | Lang_: tingkat E, 2/20 |
| U10 Lisensi | YA | Apache-2.0 |
| U11 Siap registri | YA | `npm pack` di CI, gate tag |
| U12 Dokumentasi | YA | 10 publik + 2 internal |
| U13 Kerahasiaan & dokumen bersih | YA | doctor |

*Lisensi dokumen: Apache-2.0 · © codinglombok*
