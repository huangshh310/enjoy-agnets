/**
 * 解析器：Markdown / Office 文档 (PPT/Word/Excel) / PDF / 纯文本 / 代码与配置 / CSV。
 * 单个文件失败不阻塞其他文件。
 */
const TEXT_EXT = new Set([
  // Documents & Markdown
  ".md",
  ".mdx",
  ".txt",
  ".log",
  ".rst",
  ".tex",
  ".adoc",
  ".asciidoc",
  ".rtf",
  // Presentations & Spreadsheets & Office
  ".csv",
  ".tsv",
  ".pptx",
  ".ppt",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".odt",
  ".key",
  // Web & UI
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".less",
  ".vue",
  ".svelte",
  ".svg",
  // JavaScript & TypeScript
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  // Python & Data
  ".py",
  ".pyw",
  ".ipynb",
  // JVM & Native
  ".java",
  ".kt",
  ".kts",
  ".rs",
  ".go",
  ".c",
  ".cpp",
  ".cc",
  ".cxx",
  ".h",
  ".hpp",
  ".cs",
  ".rb",
  ".php",
  // Shell & Scripts
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".bat",
  ".cmd",
  // Config & Data Formats
  ".json",
  ".json5",
  ".jsonc",
  ".yml",
  ".yaml",
  ".toml",
  ".xml",
  ".sql",
  ".graphql",
  ".gql",
  ".proto",
  ".ini",
  ".cfg",
  ".conf",
  ".env",
  ".env.example"
])

const OFFICE_EXT = new Set([
  ".pptx",
  ".ppt",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".odt"
])

export function canParse(path: string): boolean {
  const ext = extension(path)
  return TEXT_EXT.has(ext) || ext === ".pdf" || OFFICE_EXT.has(ext)
}

export function parseDocument(path: string, bytes: Uint8Array): { text: string; skipped?: string } {
  const ext = extension(path)
  if (ext === ".pdf") {
    const extracted = extractPdfText(bytes)
    if (!extracted) return { text: "", skipped: "pdf-unreadable" }
    return { text: extracted }
  }
  if (OFFICE_EXT.has(ext)) {
    const extracted = extractOfficeXmlText(bytes)
    return { text: extracted || "" }
  }
  if (!TEXT_EXT.has(ext)) {
    // 尝试提取可读文本
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
    return { text: raw }
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(bytes) }
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

function extractOfficeXmlText(bytes: Uint8Array): string {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  const tagMatches = [...raw.matchAll(/<([a-zA-Z0-9]+:)?t(?:\s+[^>]*)?>([^<]+)<\/([a-zA-Z0-9]+:)?t>/g)]
  if (tagMatches.length > 0) {
    return tagMatches.map((m) => m[2]?.trim() || "").filter(Boolean).join(" ")
  }
  const printable = raw.match(/[\p{L}\p{N}\p{P}\s]{4,}/gu) || []
  return printable.map((s) => s.trim()).filter((s) => s.length > 3).join("\n")
}
