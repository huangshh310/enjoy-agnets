/**
 * 建索引前的纯判断：不可分块文件、已有来源复用、工作区是否有预设目录。
 */

const INDEXABLE_EXT = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".csv",
  ".tsv",
  ".pdf",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".xlsx",
  ".xls",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".yml",
  ".yaml",
  ".py",
  ".rs",
  ".go",
  ".java",
  ".html",
  ".css",
  ".vue",
  ".sql"
])

export function isIndexableKnowledgeFile(path: string): boolean {
  const normalized = path.replaceAll("\\", "/")
  const name = normalized.slice(normalized.lastIndexOf("/") + 1)
  const dot = name.lastIndexOf(".")
  if (dot < 0) return false
  return INDEXABLE_EXT.has(name.slice(dot).toLowerCase())
}

export function findSourceIdByPath(
  sources: Array<{ id: string; path: string }>,
  targetPath: string
): string | undefined {
  const wanted = targetPath.trim().replaceAll("\\", "/")
  return sources.find((source) => source.path.replaceAll("\\", "/") === wanted)?.id
}

export function presetExistsInWorkspace(presetPath: string, workspaceDirPaths: string[]): boolean {
  if (presetPath === ".") return true
  const wanted = presetPath.replaceAll("\\", "/")
  return workspaceDirPaths.some((dir) => dir.replaceAll("\\", "/") === wanted)
}
