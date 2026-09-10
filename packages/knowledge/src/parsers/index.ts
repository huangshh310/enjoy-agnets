/**
 * 解析器：Markdown / Office / PDF / 纯文本。单个文件失败不阻塞其它文件。
 */
import { extractOfficeXmlText } from "./office-xml.ts"
import { extractPdfOcrText, type OcrRunner } from "./pdf-ocr.ts"
import { extractPdfText } from "./pdf-text.ts"

export type ParseDocumentOptions = {
  /** 注入 OCR；false 表示禁止 OCR（测试用）。默认本机 tesseract。 */
  ocr?: OcrRunner | false
}

const TEXT_EXT = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".log",
  ".rst",
  ".tex",
  ".adoc",
  ".asciidoc",
  ".rtf",
  ".csv",
  ".tsv",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".less",
  ".vue",
  ".svelte",
  ".svg",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".pyw",
  ".ipynb",
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
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".bat",
  ".cmd",
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
  ".env.example",
  ".key"
])

const OFFICE_EXT = new Set([".pptx", ".ppt", ".docx", ".doc", ".xlsx", ".xls", ".odt"])

export function canParse(path: string): boolean {
  const ext = extension(path)
  return TEXT_EXT.has(ext) || ext === ".pdf" || OFFICE_EXT.has(ext)
}

export function parseDocument(
  path: string,
  bytes: Uint8Array,
  options?: ParseDocumentOptions
): { text: string; skipped?: string } {
  const ext = extension(path)
  if (ext === ".pdf") return parsePdf(bytes, options?.ocr)
  if (OFFICE_EXT.has(ext)) {
    return { text: extractOfficeXmlText(bytes) || "" }
  }
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  return { text: raw }
}

function parsePdf(bytes: Uint8Array, ocr?: OcrRunner | false): { text: string; skipped?: string } {
  const extracted = extractPdfText(bytes)
  if (extracted) return { text: extracted }
  const fromOcr = extractPdfOcrText(bytes, ocr)
  if (fromOcr.text) return { text: fromOcr.text }
  return { text: "", skipped: fromOcr.skipped ?? "pdf-unreadable" }
}

function extension(path: string): string {
  const slash = path.replace(/\\/g, "/")
  const name = slash.slice(slash.lastIndexOf("/") + 1)
  const dot = name.lastIndexOf(".")
  return dot >= 0 ? name.slice(dot).toLowerCase() : ""
}
