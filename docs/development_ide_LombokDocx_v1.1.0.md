# LombokDocx — Development IDE v1.1.0

## 1. Environment

| Tool | Version |
|---|---|
| Node.js | 20 LTS or newer (CI: 20, 22, 24) |
| npm | 10+ |
| Editor | VS Code or any IDE with TypeScript support |
| Python | 3.10+ (only for `vectors/build_vectors.py`; uses the standard library plus zlib for verification) |
| Bash | for `scripts/lombok-doctor.sh` and `scripts/bump_version.sh` (Windows: Git Bash or WSL) |

## 2. Commands

| Command | Purpose |
|---|---|
| `npm ci` | install dev dependencies from the lockfile |
| `npm run lint` | `tsc --noEmit` (strict) |
| `npm test` | unit + vector runner |
| `npm run coverage` | tests with the coverage gate (95% statements / 90% branches) |
| `npm run build` | `tsup` to `dist/` (ESM + CJS + d.ts) |
| `npm run fuzz` | fuzz the XML parser and package reader with lombokfuzzer (`FUZZ_EXECUTIONS` controls the count) |
| `npm run vectors` | rebuild the vector file from `vectors/build_vectors.py` |
| `npm run doctor` | Lombok ecosystem standards check (v3.7 D-ENV) |
| `npm run check` | lint + coverage + build + doctor |

## 3. Flow for changing behaviour

1. Change the SPEC first.
2. Add or edit cases in `vectors/build_vectors.py`; XML/DOCX expected values are written by hand from the SPEC, inflate/ZIP expected values are the original inputs. The generator is deterministic: it regenerates bit-for-bit on any machine and verifies every stream against zlib at generation time (it aborts on mismatch).
3. `npm run vectors`, then update `vectors/SHA256SUMS` and the hash in the SPEC.
4. Change `src/` until `npm test` is green.
5. Record it in `CHANGELOG.md` (newest entries first).

## 4. Direction

- Python port as a second reference checker (GP-11), then Go and PHP.
- Headers, footers, footnotes, comments; format inheritance from styles.
- Automated cross-checks in CI with files produced by python-docx and LibreOffice.

*Document licence: Apache-2.0 · © codinglombok*
