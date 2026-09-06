/**
 * 步骤树字段：命令串、浏览子页。不含 query，避免 grep 被当成 bash。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord, readString } from "../../../../lib/record.ts"
import type { SubPageItem } from "./agent-step-tree.types.ts"
import type { TranslateFn } from "../../../../i18n/use-i18n.ts"

const COMMAND_KEYS = ["command", "cmd", "script", "code"] as const

export function extractCommandString(tool: ThreadToolCall): string | undefined {
  const record = asRecord(tool.args)
  const fromRecord = commandFromRecord(record)
  if (fromRecord) return fromRecord
  return commandFromJsonish(tool.args) ?? commandFromJsonish(tool.argsText)
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

export function mapToolStatus(state: ThreadToolCall["state"]): "pending" | "running" | "completed" | "error" {
  if (state === "output-error" || state === "output-denied") return "error"
  if (state === "input-streaming" || state === "input-available" || state === "approval-requested") {
    return "running"
  }
  return "completed"
}

function commandFromRecord(record: Record<string, unknown>): string | undefined {
  for (const key of COMMAND_KEYS) {
    const value = readString(record, key)
    if (value) return value
  }
  if (Array.isArray(record.argv) && record.argv.length > 0) return record.argv.map(String).join(" ")
  if (Array.isArray(record.args) && record.args.length > 0) return record.args.map(String).join(" ")
  return undefined
}

function commandFromJsonish(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined
  const s = value.trim()
  if (!s.startsWith("{") || !s.endsWith("}")) return s
  try {
    return commandFromRecord(JSON.parse(s) as Record<string, unknown>)
  } catch {
    return s
  }
}

function collectPathCandidates(args: Record<string, unknown>, result: Record<string, unknown>): string[] {
  const candidates: string[] = []
  if (typeof args.path === "string") candidates.push(args.path)
  if (typeof args.file === "string") candidates.push(args.file)
  if (typeof args.url === "string") candidates.push(args.url)
  pushStringArray(candidates, args.files)
  pushStringArray(candidates, result.files)
  if (!Array.isArray(result.entries)) return candidates
  for (const entry of result.entries) {
    if (typeof entry === "string") candidates.push(entry)
    else if (entry && typeof entry === "object" && "path" in entry && typeof entry.path === "string") {
      candidates.push(entry.path)
    }
  }
  return candidates
}

function pushStringArray(into: string[], value: unknown): void {
  if (!Array.isArray(value)) return
  for (const item of value) {
    if (typeof item === "string") into.push(item)
  }
}
