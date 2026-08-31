/**
 * 按用户添加的来源扫盘。子路径一律再走 resolveKnowledgePath，失败抛错不装空。
 */
import { readdir, stat } from "node:fs/promises"
import { resolveKnowledgePath } from "@enjoy-agents/db/path-safe"
import { shouldIgnore } from "./ignore.ts"

export async function collectKnowledgeFiles(
  root: string,
  rel: string,
  extra: string[] = []
): Promise<string[]> {
  const start = resolveKnowledgePath(root, rel)
  const info = await statExisting(start.abs, start.rel, root)
  if (info.isFile()) return shouldIgnore(start.rel, extra) ? [] : [start.abs]

  const out: string[] = []
  const entries = await readdir(start.abs, { withFileTypes: true })
  for (const entry of entries) {
    const childRel =
      start.rel === "." ? entry.name : `${start.rel.replace(/\/$/, "")}/${entry.name}`
    if (shouldIgnore(childRel, extra)) continue
    const child = resolveKnowledgePath(root, childRel)
    if (entry.isDirectory()) {
      out.push(...(await collectKnowledgeFiles(root, child.rel, extra)))
    } else {
      out.push(child.abs)
    }
  }
  return out
}

async function statExisting(abs: string, rel: string, root: string) {
  try {
    return await stat(abs)
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : ""
    if (code === "ENOENT") {
      throw new Error(`Path not found in workspace: ${rel} (under ${root})`)
    }
    throw error
  }
}
