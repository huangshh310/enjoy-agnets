/**
 * 交接卡默认摘要：最近目标 / 文件 / 未决审批。只给隐藏上下文，不进用户气泡。
 */
const MAX_LEN = 800

export function draftHandoffSummary(input: {
  messages: Array<{ role: string; content: string; tools?: Array<{ name?: string; args?: unknown }> }>
  pendingApprovalName?: string | null
  filePaths?: string[]
}): string {
  const goal = lastUserGoal(input.messages)
  const files = collectFiles(input.messages, input.filePaths)
  const approval = input.pendingApprovalName?.trim()
  const lines = [
    goal ? `目标：${goal}` : "",
    files.length ? `文件：${files.slice(0, 6).join("、")}` : "",
    approval ? `未决审批：${approval}` : ""
  ].filter(Boolean)
  const text = lines.join("\n") || "上一引擎的对话将结束；请根据工作区继续。"
  return text.length > MAX_LEN ? `${text.slice(0, MAX_LEN - 1)}…` : text
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
