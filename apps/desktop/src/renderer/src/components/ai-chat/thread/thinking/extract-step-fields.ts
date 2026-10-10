/**
 * 步骤树字段：命令串、工具路径、浏览子页。
 * 对标 monocode extractToolPreview & inputRecords 算法，彻底解决嵌套 args 提取不到真实路径的问题。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import {
  isStaleObservationAfterAllow,
  isToolNotExecuted
} from "@enjoy-agents/ipc-contract/approval-not-executed"
import type { SubPageItem } from "./agent-step-tree.types.ts"
import type { TranslateFn } from "../../../../i18n/use-i18n.ts"
import { looksLikeToolPath, normalizeToolPath } from "./looks-like-tool-path.ts"

const COMMAND_KEYS = ["command", "cmd", "script", "code", "input"] as const
const SHELL_KEYS = ["command", "cmd"] as const

const PATH_KEYS = [
  "path",
  "file",
  "file_path",
  "filePath",
  "target_file",
  "targetFile",
  "filename",
  "relative_workspace_path",
  "uri",
  "absolutePath"
] as const

/** 扁平化展开所有嵌套的参数袋（对标 monocode inputRecords） */
export function inputRecords(...values: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const seen = new Set<object>()
  const add = (value: unknown) => {
    if (!value) return
    if (Array.isArray(value)) {
      for (const item of value) add(item)
      return
    }
    const rec = parseRecord(value)
    if (!rec || Object.keys(rec).length === 0 || seen.has(rec)) return
    seen.add(rec)
    out.push(rec)
    add(rec.arguments)
    add(rec.args)
    add(rec.params)
    add(rec.input)
    add(rec.rawInput)
    add(rec.raw_input)
    add(rec.content)
    add(rec.locations)
    add(rec.location)
  }
  for (const value of values) add(value)
  return out
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === "string" && value.trim().startsWith("{") && value.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(value.trim())
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {}
  }
  return null
}

export function extractCommandString(tool: ThreadToolCall): string | undefined {
  const records = inputRecords(tool.args, tool.argsText, tool.result)
  for (const rec of records) {
    for (const key of COMMAND_KEYS) {
      const val = rec[key]
      if (typeof val === "string" && val.trim()) return val.trim()
    }
    const argv = joinStringArray(rec.argv) ?? joinStringArray(rec.args)
    if (argv) return argv
  }
  if (typeof tool.args === "string" && tool.args.trim() && !tool.args.trim().startsWith("{")) {
    return tool.args.trim()
  }
  return undefined
}

/** 只认 command / cmd / argv，不用 input/code 冒充终端。 */
export function extractShellCommand(tool: ThreadToolCall): string | undefined {
  const records = inputRecords(tool.args, tool.argsText, tool.result)
  for (const rec of records) {
    for (const key of SHELL_KEYS) {
      const val = rec[key]
      if (typeof val === "string" && val.trim()) return val.trim()
    }
    const argv = joinStringArray(rec.argv)
    if (argv) return argv
  }
  return undefined
}

export function extractToolPath(
  args: Record<string, unknown>,
  toolName?: string,
  result?: Record<string, unknown>
): string {
  const records = inputRecords(args, result)
  for (const rec of records) {
    for (const key of PATH_KEYS) {
      const taken = takePath(rec[key])
      if (taken) return taken
    }
  }
  return pathFromTitle(toolName)
}

function takePath(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return ""
  const path = normalizeToolPath(value)
  return looksLikeToolPath(path) ? path : ""
}

function pathFromTitle(toolName?: string): string {
  const match = String(toolName ?? "")
    .trim()
    .match(/^(?:read|write|edit|create|update|delete)(?:\s+file)?\s+(\S+)/i)
  return takePath(match?.[1] ?? "")
}

export function extractFilePaths(
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  t: TranslateFn
): SubPageItem[] {
  const candidates = collectPathCandidates(args, result)
  const unique = Array.from(new Set(candidates))
  return unique.map((raw, i) => {
    const name = raw.split(/[\\/]/).pop() || raw
    const http = raw.startsWith("http")
    return {
      id: `subpage_${i}_${name}`,
      title: http ? t("chat.visited", { url: raw }) : t("chat.readName", { name }),
      path: http ? undefined : raw
    }
  })
}

export type ToolRenderStatus =
  | "pending"
  | "running"
  | "completed"
  | "error"
  | "denied"
  | "skipped"
  | "stopped"

function isUserAbortedTool(tool?: Pick<ThreadToolCall, "result" | "errorText">): boolean {
  if (!tool) return false
  if (tool.errorText === "user_aborted") return true
  const result = tool.result
  return Boolean(result && typeof result === "object" && (result as { code?: string }).code === "user_aborted")
}

export function mapToolStatus(
  state: ThreadToolCall["state"],
  tool?: Pick<ThreadToolCall, "state" | "result" | "errorText">
): ToolRenderStatus {
  if (isUserAbortedTool(tool)) return "stopped"
  if (isStaleObservationAfterAllow(tool ?? { state })) return "skipped"
  if (isToolNotExecuted(tool ?? { state })) return "denied"
  if (state === "output-error") return "error"
  if (state === "input-streaming" || state === "input-available" || state === "approval-requested") {
    return "running"
  }
  return "completed"
}

function collectPathCandidates(args: Record<string, unknown>, result: Record<string, unknown>): string[] {
  const candidates: string[] = []
  const records = inputRecords(args, result)
  for (const rec of records) {
    for (const key of PATH_KEYS) {
      const p = takePath(rec[key])
      if (p) candidates.push(p)
    }
    if (typeof rec.url === "string") candidates.push(rec.url)
    pushStringArray(candidates, rec.files)
    if (Array.isArray(rec.entries)) {
      for (const entry of rec.entries) {
        if (typeof entry === "string" && looksLikeToolPath(entry)) candidates.push(normalizeToolPath(entry))
        else if (entry && typeof entry === "object" && "path" in entry && typeof entry.path === "string") {
          const p = takePath(entry.path)
          if (p) candidates.push(p)
        }
      }
    }
  }
  return candidates
}

function pushStringArray(into: string[], value: unknown): void {
  if (!Array.isArray(value)) return
  for (const item of value) {
    if (typeof item === "string" && looksLikeToolPath(item)) into.push(normalizeToolPath(item))
  }
}

function joinStringArray(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  if (!value.every((item) => typeof item === "string")) return undefined
  return value.join(" ")
}

/** 合并工具 args / argsText；delegate 与 parser 共用，禁止两处各写一遍。 */
export function mergeToolArgs(tool: ThreadToolCall): Record<string, unknown> {
  const records = inputRecords(tool.args, tool.argsText)
  const merged: Record<string, unknown> = {}
  for (let i = records.length - 1; i >= 0; i--) {
    Object.assign(merged, records[i])
  }
  return merged
}
