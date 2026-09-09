/**
 * 交接卡默认摘要：最近目标 / 文件 / 未决审批。只给隐藏上下文，不进用户气泡。
 */
const MAX_LEN = 800

export type HandoffDraftParts = {
  summary: string
  files: string[]
}

export function draftHandoffParts(input: {
  messages: Array<{ role: string; content: string; tools?: Array<{ name?: string; args?: unknown }> }>
  pendingApprovalName?: string | null
  filePaths?: string[]
}): HandoffDraftParts {
  const files = collectFiles(input.messages, input.filePaths)
  const goal = lastUserGoal(input.messages)
  const approval = input.pendingApprovalName?.trim()
  const lines = [goal ? `目标：${goal}` : "", approval ? `未决审批：${approval}` : ""].filter(Boolean)
  const summary = lines.join("\n") || "上一引擎的对话将结束；请根据工作区继续。"
  return { summary: clip(summary, MAX_LEN), files }
}

export function formatHandoffHidden(summary: string, files: string[]): string {
  const fileLine = files.length ? `文件：${files.slice(0, 6).join("、")}` : ""
  return clip([summary.trim(), fileLine].filter(Boolean).join("\n") || "上一引擎的对话将结束；请根据工作区继续。", MAX_LEN)
}

export function draftHandoffSummary(input: {
  messages: Array<{ role: string; content: string; tools?: Array<{ name?: string; args?: unknown }> }>
  pendingApprovalName?: string | null
  filePaths?: string[]
}): string {
  const parts = draftHandoffParts(input)
  return formatHandoffHidden(parts.summary, parts.files)
}

function lastUserGoal(messages: Array<{ role: string; content: string }>): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== "user") continue
    const text = message.content.trim().replace(/\s+/g, " ")
    if (!text) continue
    return text.length > 160 ? `${text.slice(0, 159)}…` : text
  }
  return ""
}

function collectFiles(
  messages: Array<{ tools?: Array<{ args?: unknown }> }>,
  extra: string[] | undefined
): string[] {
  const seen = new Set<string>()
  for (const path of extra ?? []) addPath(seen, path)
  for (const message of messages) {
    for (const tool of message.tools ?? []) addPath(seen, pathFromArgs(tool.args))
  }
  return [...seen]
}

function pathFromArgs(args: unknown): string {
  if (!args || typeof args !== "object") return ""
  const record = args as Record<string, unknown>
  for (const key of ["path", "file", "filePath"]) {
    const value = record[key]
    if (typeof value === "string") return value
  }
  return ""
}

function addPath(seen: Set<string>, path: string | undefined) {
  const name = path?.trim().split(/[\\/]/).filter(Boolean).at(-1)
  if (name) seen.add(name)
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
