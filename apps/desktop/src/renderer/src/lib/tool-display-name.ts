/**
 * 工具显示名唯一入口：线程 / Inbox 行与详情标签 / 审批共用。开发者档才露裸 id。
 */
import { TOOL_NAMES } from "@enjoy-agents/ipc-contract/tool-names"
import type { TranslateFn } from "../i18n/use-i18n.ts"
import { isDevCopyEnabled } from "./dev-copy.ts"

const TOOL_LABEL_KEY: Record<string, string> = {
  [TOOL_NAMES.writeFile]: "chat.toolName.writeFile",
  write: "chat.toolName.writeFile",
  [TOOL_NAMES.editFile]: "chat.toolName.editFile",
  edit: "chat.toolName.editFile",
  [TOOL_NAMES.readFile]: "chat.toolName.readFile",
  read: "chat.toolName.readFile",
  [TOOL_NAMES.bash]: "chat.toolName.bash",
  [TOOL_NAMES.listDir]: "chat.toolName.listDir",
  [TOOL_NAMES.glob]: "chat.toolName.glob",
  [TOOL_NAMES.grep]: "chat.toolName.grep",
  [TOOL_NAMES.gitCommit]: "chat.toolName.gitCommit",
  [TOOL_NAMES.gitDiff]: "chat.toolName.gitDiff",
  [TOOL_NAMES.gitStatus]: "chat.toolName.gitStatus",
  [TOOL_NAMES.gitLog]: "chat.toolName.gitLog",
  [TOOL_NAMES.gitPush]: "chat.toolName.gitPush",
  [TOOL_NAMES.todoWrite]: "chat.toolName.todoWrite"
}

export function toolDisplayName(name: string, t: TranslateFn): string {
  if (isDevCopyEnabled()) return name.replaceAll("_", " ")
  const key = TOOL_LABEL_KEY[name]
  return key ? t(key) : name.replaceAll("_", " ")
}

export function toolArgsOf(tool: { args?: unknown; argsText?: string }): unknown {
  if (tool.args !== undefined) return tool.args
  if (!tool.argsText?.trim()) return undefined
  try {
    return JSON.parse(tool.argsText) as unknown
  } catch {
    return undefined
  }
}

export function toolPathFromArgs(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined
  const row = args as Record<string, unknown>
  for (const key of ["path", "file_path", "filePath"]) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

export function toolShortFileName(path: string | undefined): string | undefined {
  if (!path?.trim()) return undefined
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "")
  const base = normalized.split("/").pop()?.trim()
  return base || undefined
}

/** Inbox 行 / 详情标签：人话工具名 + 文件短名，例如「写入文件 e2e-stub.txt」。 */
export function toolDisplayPhrase(name: string, t: TranslateFn, args?: unknown): string {
  const label = toolDisplayName(name, t)
  const file = toolShortFileName(toolPathFromArgs(args))
  return file ? `${label} ${file}` : label
}
