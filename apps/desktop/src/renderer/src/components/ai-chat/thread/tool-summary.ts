/**
 * 工具调用展示用的名称、参数摘要与分类。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "../../../i18n/use-i18n.ts"
import { isDevCopyEnabled } from "../../../lib/dev-copy.ts"
import { asRecord, readString } from "../../../lib/record.ts"
import {
  desktopApprovalSummaryKey,
  desktopApprovalVerb,
  desktopApprovalVerbKey
} from "./approval/desktop-approval-summary"

export function formatToolName(name: string) {
  return name.replaceAll("_", " ")
}

/** 默认面：desktop_* 走人话。开发者档才露裸名。 */
export function formatToolLabel(name: string, t: TranslateFn, args?: unknown): string {
  if (isDevCopyEnabled()) return formatToolName(name)
  if (name.startsWith("desktop_")) return desktopToolLabel(name, t, args)
  return formatToolName(name)
}

export function desktopToolLabel(name: string, t: TranslateFn, args?: unknown): string {
  if (name !== "desktop_act") return t("chat.toolDesktop")
  const row = asRecord(args)
  const app = readString(row, "appName")
  const control = readString(row, "elementName")
  if (!app) return t("chat.toolDesktop")
  const action = t(desktopApprovalVerbKey(desktopApprovalVerb(row.action)))
  return t(desktopApprovalSummaryKey(control ?? ""), { app, action, control: control ?? "" })
}

export function toolKind(name: string): "search" | "coding" | "other" {
  if (name === "grep" || name === "glob" || name === "list_dir") return "search"
  if (
    name === "bash" ||
    name === "edit_file" ||
    name === "write_file" ||
    name === "write" ||
    name === "edit" ||
    name === "read" ||
    name === "read_file" ||
    name === "git_diff" ||
    name === "git_status" ||
    name === "git_log" ||
    name === "git_commit" ||
    name === "git_push"
  ) {
    return "coding"
  }
  return "other"
}

export function summarizeToolArgs(tool: ThreadToolCall): string {
  const record = asRecord(tool.args)
  const fromArgs =
    readString(record, "path") ||
    readString(record, "file_path") ||
    readString(record, "pattern") ||
    readString(record, "command") ||
    readString(record, "glob")
  if (fromArgs) return fromArgs
  if (tool.argsText?.trim()) return tool.argsText.trim().slice(0, 96)
  return ""
}

export function parseToolArgs(tool: ThreadToolCall): unknown {
  if (tool.args !== undefined) return tool.args
  if (!tool.argsText?.trim()) return undefined
  try {
    return JSON.parse(tool.argsText)
  } catch {
    return { raw: tool.argsText }
  }
}
