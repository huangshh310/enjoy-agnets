/**
 * 从本轮已执行写类工具抽出改动文件：最多 3 个短名 + total。
 */
import { isToolNotExecuted } from "@enjoy-agents/ipc-contract/approval-not-executed"
import type { ReviewChangedFiles } from "@enjoy-agents/ipc-contract/credential-check"
import { isWriteTypeToolName } from "@enjoy-agents/ipc-contract/tool-names"
import type { TurnToolSnapshot } from "@enjoy-agents/ipc-contract/turn-outcome"

export function reviewFilesFromTools(
  tools: readonly TurnToolSnapshot[]
): ReviewChangedFiles | undefined {
  const names: string[] = []
  const seen = new Set<string>()
  for (const tool of tools) {
    if (!isWriteTypeToolName(tool.name)) continue
    if (tool.state === "approval-requested" || isToolNotExecuted(tool)) continue
    const path = pathOf(tool.args) ?? pathOf(tool.result)
    if (!path || seen.has(path)) continue
    seen.add(path)
    names.push(fileNameOf(path))
  }
  if (names.length === 0) return undefined
  return { names: names.slice(0, 3), total: names.length }
}

function pathOf(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined
  const rec = value as Record<string, unknown>
  for (const key of ["path", "file", "filePath", "filename"]) {
    if (typeof rec[key] === "string" && rec[key].trim()) return rec[key].trim()
  }
  return undefined
}

function fileNameOf(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/")
  return parts[parts.length - 1] || path
}
