/**
 * 上一轮：最后一条非续跑用户消息之后、助手工具参数里的 path。
 */

import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { TOOL_NAMES } from "@enjoy-agents/ipc-contract/tool-names"
import type { ThreadMessage } from "../../../../../stores/chat-store.types"

const CONTINUE_MARKERS = [
  "继续完成未完成的内容",
  "继续完成 Todo List",
  "继续完成剩余任务",
  "Continue the unfinished Todo List",
  "The Todo List still has unfinished items.",
  "Continue the in_progress Todo List"
]

/** 带 path 入参的写类工具：Enjoy 名走契约，后 5 个是外部引擎的写 / 删别名。 */
const PATH_WRITE_TOOLS = new Set<string>([
  TOOL_NAMES.writeFile,
  TOOL_NAMES.editFile,
  "write",
  "edit",
  "delete_file",
  "delete",
  "apply_patch",
  "str_replace",
  "strreplace"
])

export function pathsFromLastTurn(messages: ThreadMessage[]): string[] {
  let lastUser = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.role === "user" && !isContinueUser(msg.content)) {
      lastUser = i
      break
    }
  }
  if (lastUser < 0) return []

  const paths: string[] = []
  const seen: Record<string, true> = {}
  for (let i = lastUser + 1; i < messages.length; i++) {
    const msg = messages[i]
    if (!msg || msg.role === "user") break
    for (const path of pathsFromTools(msg.tools ?? [])) {
      if (seen[path]) continue
      seen[path] = true
      paths.push(path)
    }
  }
  return paths
}

/** 单条助手轮里写盘工具的 path，给气泡下改动树。 */
export function pathsFromTools(tools: ThreadToolCall[]): string[] {
  const paths: string[] = []
  const seen: Record<string, true> = {}
  for (const tool of tools) {
    const path = pathFromTool(tool)
    if (!path || seen[path]) continue
    seen[path] = true
    paths.push(path)
  }
  return paths
}

/** 按目录分组，气泡下画两级改动树。 */
export function groupChangedPaths(paths: string[]): Array<{ dir: string; files: string[] }> {
  const groups = new Map<string, string[]>()
  for (const path of paths) {
    const normalized = path.replace(/\\/g, "/")
    const slash = normalized.lastIndexOf("/")
    const dir = slash < 0 ? "." : normalized.slice(0, slash)
    const file = slash < 0 ? normalized : normalized.slice(slash + 1)
    const files = groups.get(dir) ?? []
    files.push(file)
    groups.set(dir, files)
  }
  return [...groups.entries()].map(([dir, files]) => ({ dir, files }))
}

function pathFromTool(tool: ThreadToolCall): string | null {
  if (!isWriteTool(tool.name)) return null
  return readToolPath(tool.args) ?? readToolPath(tool.result)
}

/** Enjoy 本地工具 + CLI/ACP 常见写盘名（Write / StrReplace / apply_patch）。 */
function isWriteTool(name: string): boolean {
  const n = name.toLowerCase().replace(/[\s-]/g, "_")
  if (PATH_WRITE_TOOLS.has(n) || PATH_WRITE_TOOLS.has(name)) return true
  if (/(^|_)(read|search|glob|grep|list|fetch)(_|$)/.test(n) || n.includes("read")) return false
  return n.includes("write") || n.includes("edit") || n.includes("patch") || n.includes("strreplace")
}

function readToolPath(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const rec = value as Record<string, unknown>
  if (typeof rec.path === "string" && rec.path.trim()) return rec.path.replace(/\\/g, "/")
  if (typeof rec.file === "string" && rec.file.trim()) return rec.file.replace(/\\/g, "/")
  return null
}

function isContinueUser(content: string | undefined): boolean {
  const text = content?.trim() ?? ""
  if (!text) return false
  return CONTINUE_MARKERS.some((marker) => text.startsWith(marker) || text === marker)
}
