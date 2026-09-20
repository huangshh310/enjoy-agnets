/**
 * 账本行分类与人话字段。命令只留一行摘要，stdout 另字段。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord } from "../../../lib/record.ts"
import { displayBaseName } from "../thread/sources/source-path.ts"
import {
  isBashTool,
  isEditTool,
  isReadTool,
  isSearchTool
} from "../thread/thinking/agent-step-kind.ts"
import { extractCommandString, extractShellCommand, extractToolPath } from "../thread/thinking/extract-step-fields.ts"
import type { LedgerGroupKind, RunLedgerEntry, RunLedgerKind } from "./run-ledger.types"

const FILE_SOURCE_NAMES =
  /^(read_file|read|open_file|glob|grep|repo_outline|list_dir|write_file|write|edit_file|edit|apply_patch|str_replace)$/

export function isLedgerFileSourceName(name: string): boolean {
  return FILE_SOURCE_NAMES.test(name.trim().toLowerCase().replace(/[\s-]/g, "_"))
}

/** 用量不弹 sheet。文件行必开；纯命令也可开（给无文件轮次的诚实空态）。 */
export function ledgerOpensSources(entry: RunLedgerEntry): boolean {
  return entry.kind !== "usage"
}

export function ledgerGroupDefaultOpen(kind: LedgerGroupKind): boolean {
  return kind === "edit" || kind === "error"
}

export function entryFromTool(tool: ThreadToolCall): RunLedgerEntry | null {
  const kind = kindFromTool(tool)
  if (!kind) return null
  const failed = toolFailed(tool)
  const path = toolPath(tool)
  const fileName = path ? displayBaseName(path) : undefined
  if (kind === "command") {
    // 命令不吃 result 里的 path，避免测试输出把 cwd / 失败文件误当成来源。
    const commandPath = extractToolPath(asRecord(tool.args), tool.name)
    return commandEntry(tool, failed, commandPath, commandPath ? displayBaseName(commandPath) : undefined)
  }
  return {
    id: `ledger:${tool.id}`,
    kind,
    title: fileName || tool.name,
    fileName,
    path: path || undefined,
    pathHint: path ? pathHint(path) : undefined,
    detail: kind === "error" ? firstLine(tool.errorText) : undefined,
    sourceChipId: path ? `file:${path}` : undefined,
    failed
  }
}

function kindFromTool(tool: ThreadToolCall): RunLedgerKind | null {
  const name = normalizeToolName(tool.name)
  const args = asRecord(tool.args)
  const result = asRecord(tool.result)
  const shell = extractShellCommand(tool)
  if (isCommandLike(name, shell)) return "command"
  if (toolFailed(tool)) return "error"
  if (isEditTool(name, args, result)) return "edit"
  if (isSearchTool(tool, name) && toolPath(tool)) return "read"
  if (isReadTool(name, args, tool.name) && toolPath(tool)) return "read"
  return null
}

function commandEntry(
  tool: ThreadToolCall,
  failed: boolean,
  path: string,
  fileName?: string
): RunLedgerEntry {
  return {
    id: `ledger:${tool.id}`,
    kind: "command",
    title: commandSummary(tool),
    toolLabel: commandToolLabel(tool.name),
    fileName,
    path: path || undefined,
    pathHint: path ? pathHint(path) : undefined,
    output: readCommandOutput(tool.result),
    sourceChipId: path ? `file:${path}` : undefined,
    failed
  }
}

function isCommandLike(name: string, shell?: string): boolean {
  if (name.startsWith("git_")) return true
  return isBashTool(name, shell) || /^(bash|command|cmd|argv|shell)$/.test(name)
}

function toolFailed(tool: ThreadToolCall): boolean {
  if (tool.state === "output-error" || tool.state === "output-denied") return true
  if (tool.errorText?.trim()) return true
  const exit = asRecord(tool.result).exitCode
  return typeof exit === "number" && exit !== 0
}

function toolPath(tool: ThreadToolCall): string {
  return extractToolPath(asRecord(tool.args), tool.name, asRecord(tool.result))
}

function commandToolLabel(name: string): string {
  const n = normalizeToolName(name)
  if (n.startsWith("git")) return "git"
  if (/^(bash|sh|shell|terminal|code_mode|command|cmd)$/.test(n)) return "bash"
  return n.replaceAll("_", " ")
}

function commandSummary(tool: ThreadToolCall): string {
  const name = normalizeToolName(tool.name)
  if (name.startsWith("git_")) return name.replace(/^git_/, "").replaceAll("_", " ")
  const raw = extractShellCommand(tool) ?? extractCommandString(tool)
  if (!raw?.trim()) return name.replaceAll("_", " ")
  const first = raw.replace(/^\$\s*/, "").split("\n")[0]?.trim() ?? ""
  return first.length > 42 ? `${first.slice(0, 40)}…` : first
}

function readCommandOutput(result: unknown): string | undefined {
  const rec = asRecord(result)
  for (const key of ["stdout", "output", "text", "stderr"] as const) {
    const value = rec[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function pathHint(path: string): string | undefined {
  const parts = path.replaceAll("\\", "/").split("/").filter(Boolean)
  if (parts.length <= 1) return undefined
  return `${parts.slice(0, -1).join("/")}/…`
}

function firstLine(text?: string): string | undefined {
  const line = text?.trim().split("\n")[0]?.trim()
  if (!line) return undefined
  return line.length > 42 ? `${line.slice(0, 40)}…` : line
}

function normalizeToolName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]/g, "_")
}
