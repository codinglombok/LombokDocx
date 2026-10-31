# LombokDocx — Map v1.1.0

## 1. Position in the ecosystem

```
Cluster 03 Format, Parser & Serialisation · level L0 (no mandatory Lombok dependencies)

L0  LombokDocx
     mandatory dependencies : (none)
     optional dependencies  : (none today; candidates: LombokCompress for DEFLATE, LombokLocale for messages)
     dev dependencies       : lombokfuzzer
```

Inflate and ZIP are implemented in-house to keep the library L0. When LombokCompress later offers a DEFLATE decoder with the same vectors, LombokDocx can take it as an optional dependency without changing behaviour.

## 2. Example consumers in the ecosystem

| Consumer | Use |
|---|---|
| LombokPDF (application) | DOCX import to PDF |
| LombokRAGFrameworks (application) | DOCX loader |
| LombokDocFlow SDK | DOCX adapter |

## 3. Features x ports

| Feature | TypeScript | Python | Go | PHP |
|---|---|---|---|---|
| inflate, ZIP | YES (passes vectors) | stub | stub | stub |
| XML | YES (passes vectors) | stub | stub | stub |
| WordprocessingML, text, HTML | YES (passes vectors) | stub | stub | stub |
| DOCX writer | YES (round-trip tests, verified with python-docx) | stub | stub | stub |

*Document licence: Apache-2.0 · © codinglombok*
