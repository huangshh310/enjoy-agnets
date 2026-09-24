/**
 * 扩展名到色标种类。未知和无扩展名走通用。
 */

export type FileKind = "code" | "script" | "data" | "doc" | "style" | "image" | "config" | "generic"

export function fileKindForName(name: string): FileKind {
  const ext = extensionOf(name)
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx" || ext === "vue") return "code"
  if (ext === "py" || ext === "go" || ext === "rs") return "script"
  if (ext === "json") return "data"
  if (ext === "md") return "doc"
  if (ext === "css") return "style"
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif" || ext === "webp" || ext === "svg") return "image"
  if (ext === "yml" || ext === "yaml") return "config"
  return "generic"
}

function extensionOf(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name
  const dot = base.lastIndexOf(".")
  if (dot <= 0) return ""
  return base.slice(dot + 1).toLowerCase()
}
