/**
 * 解析器：Markdown / 纯文本 / TS/JS / JSON / 配置 / PDF。
 * 单个文件失败不阻塞其他文件。
 */
const TEXT_EXT = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".css",
  ".html"
])

export function canParse(path: string): boolean {
  const ext = extension(path)
  return TEXT_EXT.has(ext) || ext === ".pdf"
}

export function parseDocument(path: string, bytes: Uint8Array): { text: string; skipped?: string } {
  const ext = extension(path)
  if (ext === ".pdf") {
    const extracted = extractPdfText(bytes)
    if (!extracted) return { text: "", skipped: "pdf-unreadable" }
    return { text: extracted }
  }
  if (!TEXT_EXT.has(ext)) return { text: "", skipped: "unsupported" }
  return { text: new TextDecoder("utf-8").decode(bytes) }
}

function extension(path: string): string {
  const slash = path.replace(/\\/g, "/")
  const name = slash.slice(slash.lastIndexOf("/") + 1)
  const dot = name.lastIndexOf(".")
  return dot >= 0 ? name.slice(dot).toLowerCase() : ""
}

function extractPdfText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes)
  const matches = [...raw.matchAll(/\((\\[nrt]|\\\)|[^)]){3,}\)/g)]
  const text = matches
    .map((match) => match[0].slice(1, -1).replace(/\\n/g, "\n"))
    .join("\n")
    .trim()
  return text
}
