# LombokDocx — Structure Repo v1.1.0

```
LombokDocx/
├── README.md · CHANGELOG.md · CONTRIBUTING.md · SECURITY.md · LICENSE (Apache-2.0)
├── package.json · package-lock.json · tsconfig.json · tsconfig.check.json · vitest.config.ts
├── .github/workflows/   ci.yml (matriks 3 OS x Node 20/22/24, standar, fuzz, publish pada tag) · pages.yml
├── src/
│   ├── inflate.ts       DEFLATE (RFC 1951)
│   ├── zip.ts           pembaca ZIP + penulis stored + CRC-32
│   ├── xml.ts           parser XML iteratif tanpa DTD
│   ├── wordml.ts        namespace kanonik, relasi, paragraf, run, tabel, gambar, metadata
│   ├── render.ts        HTML
│   ├── docx.ts          DocxExtractor, DocxBuilder (toDocx), XMLParser
│   ├── types.ts · errors.ts · index.ts
├── tests/               docx.test.ts (unit) · vectors.test.ts (runner) · fuzz/docx.fuzz.ts
├── vectors/             lombokdocx-vectors-v1.json · SHA256SUMS · build_vectors.py
├── scripts/             lombok-doctor.sh
├── ports/               go/ · php/ · python/ (stub)
└── docs/                10 dokumen publik + index.html; masterplan_/architecture_ internal (ADR-024)
```

*Lisensi dokumen: Apache-2.0 · © codinglombok*
