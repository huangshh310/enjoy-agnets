/**
 * Inbox 拍板短名：只取 path/file 的 basename 或 desktop_act 应用名，最长 64。
 */
import { basename } from "node:path"

const MAX_SHORT_NAME = 64
const PATH_KEYS = ["path", "file_path", "filePath"] as const

export function pendingApprovalTargetShort(name: string, args: unknown): string | undefined {
  const row = asRecord(args)
  if (name === "desktop_act") return clip(text(row.appName))
  for (const key of PATH_KEYS) {
    const short = basenameOf(row[key])
    if (short) return short
  }
  return undefined
}

function basenameOf(value: unknown): string | undefined {
  const raw = text(value)
  if (!raw) return undefined
  const base = basename(raw.replaceAll("\\", "/"))
  return clip(base)
}

function clip(value: string | undefined): string | undefined {
  if (!value) return undefined
  return value.length > MAX_SHORT_NAME ? value.slice(0, MAX_SHORT_NAME) : value
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
