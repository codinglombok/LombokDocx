# LombokDocx — Map v1.1.0

## 1. Posisi di ekosistem

```
Cluster 03 Format, Parser & Serialisasi · tingkat L0 (tanpa dependensi Lombok wajib)

L0  LombokDocx
     dependensi wajib    : (tidak ada)
     dependensi opsional : (tidak ada saat ini; kandidat: LombokCompress untuk DEFLATE, LombokLocale untuk pesan)
     dependensi dev      : lombokfuzzer
```

Inflate dan ZIP diimplementasikan sendiri agar library tetap L0. Bila LombokCompress kelak menyediakan dekoder DEFLATE dengan vector yang sama, LombokDocx dapat memakainya sebagai dependensi opsional tanpa mengubah perilaku.

## 2. Contoh pemakai di ekosistem

| Pemakai | Pemakaian |
|---|---|
| LombokPDF (aplikasi) | impor DOCX ke PDF |
| LombokRAGFrameworks (aplikasi) | loader DOCX |
| LombokDocFlow SDK | adaptor DOCX |

## 3. Fitur x port

| Fitur | TypeScript | Python | Go | PHP |
|---|---|---|---|---|
| inflate, ZIP | YA (lulus vector) | stub | stub | stub |
| XML | YA (lulus vector) | stub | stub | stub |
| WordprocessingML, teks, HTML | YA (lulus vector) | stub | stub | stub |
| Penulis DOCX | YA (test round-trip, diverifikasi python-docx) | stub | stub | stub |

*Lisensi dokumen: Apache-2.0 · © codinglombok*
