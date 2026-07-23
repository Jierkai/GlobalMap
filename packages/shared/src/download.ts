/**
 * Trigger a browser download for the given Blob via a temporary anchor element.
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Trigger a browser download for a text payload. Wraps the text in a Blob and
 * delegates to {@link downloadBlob}.
 */
export function downloadText(filename: string, text: string, mimeType = 'text/plain'): void {
  downloadBlob(filename, new Blob([text], { type: mimeType }))
}
