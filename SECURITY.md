# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 1.1.x | Yes |
| 1.0.x and older | No (1.0.x did not read files) |

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories:
<https://github.com/codinglombok/LombokDocx/security/advisories/new>.
Do not open a public issue. You should receive an acknowledgement within 3 working days and a fix or mitigation plan within 30 days.

## Scope and threat model

LombokDocx is designed to read untrusted `.docx` files. The guarantees are normative in [SPEC section 8](docs/SPEC_LombokDocx_v1.1.0.md#8-keamanan-normatif):

- no DTD, external entity, or entity expansion (XXE and "billion laughs" are rejected);
- decompression is bounded by the declared entry size and by configurable per-entry and total limits (ZIP bombs stop before large allocations);
- the XML parser is iterative with a configurable depth limit;
- HTML output escapes all text, allows only `http:`, `https:`, `mailto:`, and `#` links, and never inlines SVG;
- ZIP entry names are never used as file system paths, and macros are never executed.

Out of scope: the content of embedded images (passed through as bytes) and inserting the generated HTML inside `<script>`, `<style>`, or unquoted attributes.
