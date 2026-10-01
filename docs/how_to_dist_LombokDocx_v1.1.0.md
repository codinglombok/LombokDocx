# LombokDocx — How to Dist v1.1.0

## 1. Registry

| Registry | Nama | Status | Mekanisme |
|---|---|---|---|
| npm | `lombokdocx` | belum terbit | job `publish-npm` di `ci.yml` pada tag `v*`, `npm publish --provenance`, rahasia `NPM_TOKEN` |
| jsDelivr / unpkg | `lombokdocx` | otomatis setelah npm | `https://cdn.jsdelivr.net/npm/lombokdocx@1.1.0/dist/index.js` |
| PyPI / Packagist / Go | `lombokdocx` · `codinglombok/lombokdocx` · `github.com/codinglombok/lombokdocx/go` | tidak dipublikasikan | port belum ada (stub) |

## 2. Alur rilis

1. Semua perubahan masuk lewat PR dengan CI hijau (lint, test + coverage, build, `npm pack --dry-run`, `scripts/lombok-doctor.sh`).
2. Versi di `package.json`, nama berkas `docs/*_v<versi>.md`, dan entri teratas `CHANGELOG.md` harus sama (diperiksa doctor).
3. Buat tag `v<versi>` dari `main`. Job `publish-npm` memeriksa tag = versi `package.json`, menjalankan ulang test, lalu menerbitkan dengan provenance.

```powershell
git switch main ; git pull
npm ci ; npm run check
git tag v1.1.0 ; git push origin v1.1.0
```

## 3. Pasca-rilis

```powershell
npm view lombokdocx@1.1.0 version
npm i lombokdocx@1.1.0
```

Rollback: `npm deprecate lombokdocx@1.1.0 "gunakan 1.1.1"` (unpublish hanya dalam 72 jam dan tanpa dependen).

*Lisensi dokumen: Apache-2.0 · © codinglombok*
