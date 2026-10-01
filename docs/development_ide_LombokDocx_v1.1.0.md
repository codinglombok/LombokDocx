# LombokDocx — Development IDE v1.1.0

## 1. Lingkungan

| Alat | Versi |
|---|---|
| Node.js | 20 LTS atau lebih baru (CI: 20, 22, 24) |
| npm | 10+ |
| Editor | VS Code atau IDE apa pun dengan dukungan TypeScript |
| Python | 3.10+ (hanya untuk `vectors/build_vectors.py`; memakai zlib dan zipfile bawaan) |
| Bash | untuk `scripts/lombok-doctor.sh` (Windows: Git Bash atau WSL) |

## 2. Perintah

| Perintah | Fungsi |
|---|---|
| `npm ci` | pasang dependensi dev sesuai lockfile |
| `npm run lint` | `tsc --noEmit` (strict) |
| `npm test` | unit + runner vector |
| `npm run coverage` | test dengan ambang coverage 90% |
| `npm run build` | `tsup` ke `dist/` (ESM + CJS + d.ts) |
| `npm run fuzz` | fuzz parser XML dan pembaca paket dengan lombokfuzzer (`FUZZ_EXECUTIONS` mengatur jumlah) |
| `npm run vectors` | bangun ulang berkas vector dari `vectors/build_vectors.py` |
| `npm run doctor` | pemeriksaan standar Lombok v3.6 |
| `npm run check` | lint + coverage + build + doctor |

## 3. Alur mengubah perilaku

1. Ubah SPEC lebih dulu.
2. Tambah atau ubah kasus di `vectors/build_vectors.py`; nilai harapan XML/DOCX ditulis tangan dari SPEC, nilai harapan inflate/ZIP berasal dari Python zlib/zipfile, bukan dari keluaran kode. Berkas vector tidak dibangun ulang di CI karena byte terkompresi bergantung versi zlib.
3. `npm run vectors`, lalu perbarui `vectors/SHA256SUMS` dan hash di SPEC.
4. Ubah `src/` sampai `npm test` hijau.
5. Catat di `CHANGELOG.md` (entri terbaru di depan).

## 4. Arah pengembangan

- Port Python sebagai pemeriksa referensi kedua (GP-11), lalu Go dan PHP.
- Header, footer, catatan kaki, komentar; pewarisan format dari gaya.
- Verifikasi silang otomatis di CI dengan berkas buatan python-docx dan LibreOffice.

*Lisensi dokumen: Apache-2.0 · © codinglombok*
