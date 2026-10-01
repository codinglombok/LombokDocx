# LombokDocx — Guide How to Use v1.1.0

## 1. Pemasangan

```bash
npm install lombokdocx
```

Belum terbit di npm saat dokumen ini ditulis; sementara: `npm install github:codinglombok/LombokDocx`.

## 2. Membaca DOCX

```ts
import { DocxExtractor } from 'lombokdocx'

const ex = new DocxExtractor('./laporan.docx')
const doc = await ex.extract()
doc.metadata.title        // judul dari docProps/core.xml
doc.blocks                // paragraf dan tabel sesuai urutan dokumen
await ex.extractText()    // teks polos
await ex.extractHTML()    // fragmen HTML aman
```

Di browser atau edge, berikan byte berkas:

```ts
import { readDocx, renderHTML } from 'lombokdocx'
const bytes = new Uint8Array(await file.arrayBuffer())
const html = renderHTML(readDocx(bytes), { includeTitle: false })
```

## 3. Berkas tak tepercaya

Batas bawaan menghentikan bom ZIP dan XML yang sangat dalam. Perketat untuk layanan unggahan:

```ts
import { readDocx, DocxError } from 'lombokdocx'
try {
  readDocx(bytes, { maxEntrySize: 20 * 1024 * 1024, maxTotalSize: 50 * 1024 * 1024, extractImages: false })
} catch (e) {
  if (e instanceof DocxError) console.log(e.code) // INVALID_ZIP, LIMIT_EXCEEDED, ...
}
```

## 4. Membuat DOCX

```ts
import { DocxBuilder } from 'lombokdocx'
import { writeFileSync } from 'node:fs'

const bytes = new DocxBuilder()
  .setMetadata({ title: 'Notulen Rapat', author: 'Sekretariat' })
  .addParagraph('Notulen Rapat', { heading: 1 })
  .addParagraph('Rapat dibuka pukul 09.00.', { align: 'justify' })
  .addTable([['No', 'Keputusan'], ['1', 'Anggaran disetujui']])
  .toDocx()
writeFileSync('notulen.docx', bytes)
```

## 5. Skenario pemakaian

| Skenario | Contoh |
|---|---|
| Pratinjau unggahan | tampilkan isi DOCX di aplikasi web tanpa konversi di server |
| Pengindeksan dan pencarian | ambil teks dan metadata untuk mesin pencari internal |
| Pembuatan dokumen otomatis | surat, laporan, notulen dari data aplikasi |
| Migrasi konten | pindahkan dokumen Word ke CMS sebagai HTML bersih |
| Perangkat edge | baca DOCX di gateway tanpa dependensi native |

## 6. Batasan

Lihat [full_summary_](full_summary_project_LombokDocx_v1.1.0.md) bagian "Batasan yang Diketahui".

*Lisensi dokumen: Apache-2.0 · © codinglombok*
