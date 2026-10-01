export type DocxErrorCode =
  | 'INVALID_ZIP'
  | 'UNSUPPORTED_ZIP'
  | 'CORRUPT_DATA'
  | 'LIMIT_EXCEEDED'
  | 'INVALID_XML'
  | 'MISSING_PART'

/** Error with a stable, language-neutral `code` (SPEC §7). */
export class DocxError extends Error {
  readonly code: DocxErrorCode
  constructor(code: DocxErrorCode, message: string) {
    super(message)
    this.name = 'DocxError'
    this.code = code
  }
}
