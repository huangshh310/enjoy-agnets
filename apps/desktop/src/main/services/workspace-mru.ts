/**
 * 工作区最近使用顺序。lastWorkspaceId 是当前指针，删掉自己以后不能当「上一个」。
 */
export const RECENT_WORKSPACE_SETTING = "recentWorkspaceIds"
export const RECENT_WORKSPACE_CAP = 20

export function parseRecentWorkspaceIds(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0)
  } catch {
    return []
  }
}

/** 切换写入：最新的排最前，去重截断。 */
export function rememberRecentWorkspace(recent: readonly string[], workspaceId: string): string[] {
  return [workspaceId, ...recent.filter((id) => id !== workspaceId)].slice(0, RECENT_WORKSPACE_CAP)
}

/** 只有前台用户开跑才写 MRU；心跳 / 续跑 / 自动化不写。 */
export function shouldRememberWorkspaceOnRun(input: {
  automationSource?: unknown
  isResume?: boolean
  isHeartbeat?: boolean
}): boolean {
  return !input.automationSource && !input.isResume && !input.isHeartbeat
}

/** 删除后取排除被删项的最近一个；都没有再名单第一个。 */
export function pickRecentWorkspaceAfterRemove(
  recent: readonly string[],
  remainingIds: readonly string[]
): string | null {
  const alive = new Set(remainingIds)
  return recent.find((id) => alive.has(id)) ?? remainingIds[0] ?? null
}

export type WorkspaceMruStore = {
  get: (key: string) => string | undefined
  set: (key: string, value: string) => void
}

/** 真实切换写入路径：同时更新当前指针和 MRU。 */
export function rememberWorkspaceUse(workspaceId: string, store: WorkspaceMruStore): void {
  const recent = rememberRecentWorkspace(
    parseRecentWorkspaceIds(store.get(RECENT_WORKSPACE_SETTING)),
    workspaceId
  )
  store.set("lastWorkspaceId", workspaceId)
  store.set(RECENT_WORKSPACE_SETTING, JSON.stringify(recent))
}

/** 删除后按 MRU 收口，并写回 settings。 */
export function nextWorkspaceIdAfterRemove(
  removedId: string,
  remainingIds: readonly string[],
  store: WorkspaceMruStore
): string | null {
  const recent = parseRecentWorkspaceIds(store.get(RECENT_WORKSPACE_SETTING)).filter(
    (id) => id !== removedId && remainingIds.includes(id)
  )
  const next = pickRecentWorkspaceAfterRemove(recent, remainingIds)
  store.set(RECENT_WORKSPACE_SETTING, JSON.stringify(recent))
  store.set("lastWorkspaceId", next ?? "")
  return next
}
