/**
 * 选中工作区即 watch；onChanged 防抖后刷新 changes 与 git log。
 * 审查栏不得依赖 Files 页才启动监视。
 */
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  createChangeInvalidator,
  shouldInvalidateChange,
  WORKSPACE_CHANGE_DEBOUNCE_MS
} from "./workspace-change-invalidation"

export function useWorkspaceChangeInvalidation(workspaceId: string | null) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!hasIde() || !workspaceId) return
    void getIde().workspace.watch({ workspaceId })
    const invalidator = createChangeInvalidator({
      debounceMs: WORKSPACE_CHANGE_DEBOUNCE_MS,
      invalidate: () => {
        void queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] })
        void queryClient.invalidateQueries({ queryKey: ["workspace-git-log", workspaceId] })
      }
    })
    const unsubscribe = getIde().workspace.onChanged((event) => {
      if (!shouldInvalidateChange(event, workspaceId)) return
      invalidator.schedule()
    })
    return () => {
      invalidator.cancel()
      unsubscribe()
    }
  }, [queryClient, workspaceId])
}
