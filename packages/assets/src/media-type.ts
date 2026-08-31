/**
 * 附件 MIME：浏览器 File.type 对 .md 常为空，按扩展名补，勿默认 octet-stream。
 */

const EXT_TO_MEDIA: Record<string, string> = {
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  yaml: "text/yaml",
  yml: "text/yaml",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  cjs: "text/javascript",
  ts: "text/plain",
  tsx: "text/plain",
  jsx: "text/javascript",
  py: "text/plain",
  rs: "text/plain",
  go: "text/plain",
  java: "text/plain",
  kt: "text/plain",
  rb: "text/plain",
  php: "text/plain",
  sh: "text/plain",
  bash: "text/plain",
  sql: "text/plain",
  toml: "text/plain",
  ini: "text/plain",
  log: "text/plain",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm"
}

const TEXT_APPLICATION = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
  "application/sql",
  "application/yaml"
])

function extensionOf(name: string): string | undefined {
  const lower = name.replaceAll("\\", "/").split("/").pop()?.toLowerCase() ?? ""
  if (lower.endsWith(".d.ts")) return "ts"
  const dot = lower.lastIndexOf(".")
  if (dot <= 0 || dot === lower.length - 1) return undefined
  return lower.slice(dot + 1)
}

function isBlankOrGeneric(mediaType: string | undefined): boolean {
  const value = mediaType?.trim().toLowerCase() ?? ""
  return value === "" || value === "application/octet-stream"
}

/** 已声明的具体 MIME 优先；空值 / octet-stream 按文件名补。 */
export function resolveMediaType(fileName: string, declared?: string): string {
  if (!isBlankOrGeneric(declared) && declared) return declared.trim()
  const ext = extensionOf(fileName)
  if (ext && EXT_TO_MEDIA[ext]) return EXT_TO_MEDIA[ext]
  return declared?.trim() || "application/octet-stream"
}

export function isImageMediaType(mediaType: string): boolean {
  return mediaType.toLowerCase().startsWith("image/")
}

export function isPdfMediaType(mediaType: string): boolean {
  return mediaType.toLowerCase() === "application/pdf"
}

export function isTextLikeMediaType(mediaType: string): boolean {
  const value = mediaType.toLowerCase()
  return value.startsWith("text/") || TEXT_APPLICATION.has(value)
}
