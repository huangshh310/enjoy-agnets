/**
 * 启动对齐：只跑一次，且只在还没有当前工作区时发生。
 */
import { useEffect, useRef } from "react"
import { useChatStore } from "../stores/chat-store"
import { syncBootWorkspace } from "./plan-boot-workspace"
import type { WorkspaceRow } from "./workspace-row"

export function useBootWorkspace(
  settingsReady: boolean,
  lastWorkspaceId: string | null | undefined,
  recentWorkspaceIds: readonly string[] | undefined,
  workspaces: readonly WorkspaceRow[] | undefined,
  load: (workspace: WorkspaceRow) => void
) {
  const bootAligned = useRef(false)
  useEffect(() => {
    if (bootAligned.current || !settingsReady) return
    if (useChatStore.getState().workspaceId) {
      bootAligned.current = true
      return
    }
    if (!workspaces) return
    bootAligned.current = true
    syncBootWorkspace(workspaces, lastWorkspaceId, load, recentWorkspaceIds)
  }, [settingsReady, lastWorkspaceId, recentWorkspaceIds, workspaces, load])
}
