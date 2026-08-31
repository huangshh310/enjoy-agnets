/**
 * 开局把工作区里一小撮源码文本写进 sandbox，方便后续编码。
 * 这不是产品级云同步：只拷允许的文本后缀，跳过依赖与构建产物。
 */
import { readdir, readFile, stat } from "node:fs/promises"
import { extname, join, relative } from "node:path"

const SKIP = new Set(["node_modules", ".git", "dist", "out", ".turbo", ".next", "coverage"])
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".html",
  ".vue",
  ".py",
  ".go",
  ".rs",
  ".toml",
  ".yml",
  ".yaml"
])
const MAX_FILES = 40
const MAX_BYTES = 80_000

/** 收集可上传的文本文件；超限或非白名单后缀直接跳过。 */
export async function collectWorkspaceTexts(root: string): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = []
  await walk(root, root, files)
  return files
}

async function walk(
  root: string,
  dir: string,
  files: Array<{ path: string; content: string }>
): Promise<void> {
  if (files.length >= MAX_FILES) return
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (files.length >= MAX_FILES) return
    if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(root, full, files)
      continue
    }
    if (!TEXT_EXT.has(extname(entry.name).toLowerCase())) continue
    const info = await stat(full)
    if (info.size > MAX_BYTES) continue
    const content = await readFile(full, "utf8")
    files.push({ path: relative(root, full).replaceAll("\\", "/"), content })
  }
}
