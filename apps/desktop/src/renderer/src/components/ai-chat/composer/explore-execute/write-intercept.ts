/**
 * 探索态写工具拦截：模型仍请求写入时，UI 出条 + 切执行 CTA。
 * 不改审批策略；只认已有 deny / 审批停车。
 */
type InterceptTool = {
  name: string
  state: string
  args?: unknown
}

const WRITE_LIKE = new Set([
  "write_file",
  "edit_file",
  "write",
  "edit",
  "bash",
  "code_mode",
  "git_commit",
  "git_branch",
  "git_push",
  "str_replace",
  "apply_patch",
  "desktop_act"
])

const INTERCEPT_STATES = new Set(["output-denied", "approval-requested", "output-error"])

export type ExploreWriteIntercept = {
  toolName: string
  path?: string
}

/** 探索态下第一条被拦的写 / shell / 提交。 */
export function findExploreWriteIntercept(
  tools: readonly InterceptTool[] | undefined
): ExploreWriteIntercept | null {
  for (const tool of tools ?? []) {
    if (!INTERCEPT_STATES.has(tool.state)) continue
    if (!isWriteLikeTool(tool)) continue
    const path = extractInterceptPath(tool)
    return { toolName: tool.name, path: path || undefined }
  }
  return null
}

export function isWriteLikeTool(tool: Pick<InterceptTool, "name">): boolean {
  const name = tool.name.trim().toLowerCase()
  if (WRITE_LIKE.has(name)) return true
  return /^(write|edit|bash|shell|command|cmd|str_replace|apply_patch|create|update)$/.test(name)
}

function extractInterceptPath(tool: InterceptTool): string {
  const args = asRecord(tool.args)
  for (const key of ["path", "file", "file_path", "filePath", "target_file"] as const) {
    const value = args[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
