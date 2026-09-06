/**
 * 工具 path 必须像文件路径。拒绝 "File" / "command" 这类标题残词。
 */
const GENERIC = /^(file|folder|directory|dir|path|command|cmd|tool|read|edit|write|bash|shell)$/i

export function looksLikeToolPath(value: string): boolean {
  const text = value.trim()
  if (!text || text.length > 400 || /[\n\r]/.test(text)) return false
  if (GENERIC.test(text)) return false
  if (/^https?:/i.test(text)) return false
  return text.includes("/") || text.includes("\\") || /\.[a-z0-9]{1,12}$/i.test(text)
}

export function normalizeToolPath(value: string): string {
  return value.trim().replace(/^file:\/\//, "").replace(/\\/g, "/")
}
