/**
 * 工作区 fs 变更是否该刷新 Git / 改动查询。
 * 噪声目录已经在 main 丢掉；这里再挡一层，避免旧事件把 git status 打满。
 */
import { isIgnoredWorkspaceEventPath } from "@enjoy-agents/ipc-contract/workspace-event-path"

export { isIgnoredWorkspaceEventPath }

export function shouldInvalidateChange(
  event: { workspaceId: string; path: string },
  workspaceId: string | null
): boolean {
  if (!workspaceId || event.workspaceId !== workspaceId) return false
  return !isIgnoredWorkspaceEventPath(event.path)
}

export const WORKSPACE_CHANGE_DEBOUNCE_MS = 250

/** 合并连续 onChanged，避免按文件数打满 git status。 */
export function createChangeInvalidator(opts: {
  debounceMs: number
  invalidate: () => void
}): { schedule: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    schedule() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        opts.invalidate()
      }, opts.debounceMs)
    },
    cancel() {
      if (timer) clearTimeout(timer)
      timer = null
    }
  }
}
