import { afterEach, describe, expect, it, vi } from 'vitest'

import { downloadBlob, downloadText } from '../download'

interface AnchorStub {
  href: string
  download: string
  click: ReturnType<typeof vi.fn>
}

function stubDownloadDom() {
  const anchor: AnchorStub = { href: '', download: '', click: vi.fn() }
  const createObjectURL = vi.fn((blob: Blob) => `blob:mock-${blob.size}`)
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  vi.stubGlobal('document', { createElement: vi.fn(() => anchor) })
  return { anchor, createObjectURL, revokeObjectURL }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('downloadBlob', () => {
  it('creates an object URL from the blob and assigns it to the anchor', () => {
    const { anchor, createObjectURL } = stubDownloadDom()
    const blob = new Blob(['hello'], { type: 'text/plain' })

    downloadBlob('hello.txt', blob)

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(anchor.href).toBe('blob:mock-5')
  })

  it('sets the download attribute to the filename and clicks the anchor', () => {
    const { anchor } = stubDownloadDom()

    downloadBlob('report.csv', new Blob(['a,b']))

    expect(anchor.download).toBe('report.csv')
    expect(anchor.click).toHaveBeenCalledTimes(1)
  })

  it('revokes the object URL after triggering the download', () => {
    const { revokeObjectURL } = stubDownloadDom()

    downloadBlob('a.txt', new Blob(['ab']))

    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-2')
  })
})

describe('downloadText', () => {
  it('wraps the text in a Blob with the default text/plain MIME type', () => {
    const { createObjectURL } = stubDownloadDom()

    downloadText('note.txt', 'hello world')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain')
    expect(blob.size).toBe(11)
  })

  it('uses the provided MIME type', () => {
    const { createObjectURL } = stubDownloadDom()

    downloadText('data.json', '{}', 'application/json')

    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('application/json')
  })

  it('triggers the download with the given filename', () => {
    const { anchor } = stubDownloadDom()

    downloadText('log.txt', 'some logs')

    expect(anchor.download).toBe('log.txt')
    expect(anchor.click).toHaveBeenCalledTimes(1)
  })
})
