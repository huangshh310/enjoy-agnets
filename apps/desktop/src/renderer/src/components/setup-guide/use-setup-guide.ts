/**
 * 首次没有工作区时打开引导。已有工作区只补记完成时间。
 */
import { useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { markSetupGuideComplete } from "./mark-setup-guide-complete"
import { resolveSetupGuideGate } from "./setup-guide-gate"
import { useSetupGuideStore } from "./setup-guide-store"

export function useSetupGuide(): void {
  const snapshot = useSettingsSnapshot()
  const workspaces = useQuery({
    queryKey: ["workspaces"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.list() as Promise<unknown[]>
  })
  const open = useSetupGuideStore((state) => state.open)
  const reason = useSetupGuideStore((state) => state.reason)
  const engaged = useSetupGuideStore((state) => state.engaged)
  const paused = useSetupGuideStore((state) => state.paused)
  const show = useSetupGuideStore((state) => state.show)
  const hide = useSetupGuideStore((state) => state.hide)
  const queryClient = useQueryClient()
  const stamped = useRef(false)
  const gate = resolveSetupGuideGate({
    settingsSettled: snapshot.isSuccess || snapshot.isError,
    workspacesSettled: !hasIde() || workspaces.isSuccess || workspaces.isError,
    settingsFailed: snapshot.isError,
    workspacesFailed: workspaces.isError,
    completedAt: snapshot.data?.preferences.setupGuideCompletedAt,
    workspaceCount: workspaces.data?.length ?? 0
  })

  useEffect(() => {
    if (gate === "exempt") {
      void stampExistingInstall(stamped, () => queryClient.invalidateQueries({ queryKey: ["settings"] }))
      return
    }
    if (gate === "show" && !open && !paused) show("first-run")
    if (gate === "hidden" && open && reason === "first-run" && !engaged) hide()
  }, [engaged, gate, hide, open, paused, queryClient, reason, show])
}

async function stampExistingInstall(
  stamped: { current: boolean },
  refresh: () => Promise<unknown>
): Promise<void> {
  if (stamped.current) return
  stamped.current = true
  try {
    await markSetupGuideComplete(refresh)
  } catch {
    stamped.current = false
  }
}
