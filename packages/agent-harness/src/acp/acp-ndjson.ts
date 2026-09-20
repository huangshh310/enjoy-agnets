/**
 * ACP stdout 拆帧：NDJSON 或 Content-Length。
 */
export class AcpNdjsonReader {
  private buffer = ""
  private contentLength: number | null = null

  constructor(private readonly onRaw: (raw: string) => void) {}

  push(chunk: string) {
    this.buffer += chunk
    this.drain()
  }

  private drain() {
    while (this.buffer.length > 0) {
      if (this.contentLength == null && /^(Content-Length|Content-Type):/i.test(this.buffer)) {
        if (!this.consumeHeaders()) return
        continue
      }
      if (this.contentLength != null) {
        if (this.buffer.length < this.contentLength) return
        const raw = this.buffer.slice(0, this.contentLength)
        this.buffer = this.buffer.slice(this.contentLength)
        this.contentLength = null
        this.onRaw(raw)
        continue
      }
      const nl = this.buffer.indexOf("\n")
      if (nl < 0) return
      const line = this.buffer.slice(0, nl).trim()
      this.buffer = this.buffer.slice(nl + 1)
      if (line) this.onRaw(line)
    }
  }

  private consumeHeaders(): boolean {
    let headerEnd = this.buffer.indexOf("\r\n\r\n")
    let delimLen = 4
    if (headerEnd < 0) {
      headerEnd = this.buffer.indexOf("\n\n")
      delimLen = 2
    }
    if (headerEnd < 0) return false
    const headerBlock = this.buffer.slice(0, headerEnd)
    const match = headerBlock.match(/Content-Length:\s*(\d+)/i)
    this.buffer = this.buffer.slice(headerEnd + delimLen)
    this.contentLength = match ? Number(match[1]) : null
    return true
  }
}
