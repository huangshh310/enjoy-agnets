/**
 * 工作区内 fs.rename：路径 jail。不查 workspaces 表，方便 node:test。
 */
import { promises as fs } from "node:fs"
import { resolveKnowledgePath } from "@enjoy-agents/db/path-safe"
import { planWorkspaceMove } from "@enjoy-agents/ipc-contract/workspace-move-plan"

export const MOVE_EXISTS = "MOVE_EXISTS"
export const MOVE_NOT_FOUND = "MOVE_NOT_FOUND"

export async function renameInsideWorkspace(
  rootPath: string,
  from: string,
  toDir: string
): Promise<{ ok: true; from: string; to: string }> {
  const src = resolveKnowledgePath(rootPath, from)
  const dir = resolveKnowledgePath(rootPath, toDir)
  const planned = planWorkspaceMove(src.rel, dir.rel)
  const dest = resolveKnowledgePath(rootPath, planned.dest)
  await assertExists(src.abs, MOVE_NOT_FOUND)
  await assertMissing(dest.abs)
  await fs.rename(src.abs, dest.abs)
  return { ok: true, from: src.rel, to: dest.rel }
}

async function assertExists(abs: string, code: string): Promise<void> {
  try {
    await fs.stat(abs)
  } catch {
    throw new Error(code)
  }
}

async function assertMissing(abs: string): Promise<void> {
  try {
    await fs.stat(abs)
  } catch {
    return
  }
  throw new Error(MOVE_EXISTS)
}
