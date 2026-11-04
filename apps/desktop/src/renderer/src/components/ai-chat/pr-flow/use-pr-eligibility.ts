/**
 * 开 PR 可用性：复用 gitRepo/upstream 语义 + 显式 authStatus（Must#5）。
 */
import { useCallback, useEffect, useState } from "react"
import type { WorkspacePrProbeResult } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"

const EMPTY: WorkspacePrProbeResult = {
  reason: "not-git",
  branch: "",
  upstream: "",
  aheadCount: 0,
  draftTitle: "",
  draftBody: "",
  authStatus: "unknown"
}

export function usePrEligibility(workspaceId: string | null, enabled = true) {
  const [probe, setProbe] = useState<WorkspacePrProbeResult>(EMPTY)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!workspaceId || !hasIde() || !enabled) {
      setProbe(EMPTY)
      return
    }
    setLoading(true)
    try {
      const next = (await getIde().workspace.prProbe({ workspaceId })) as WorkspacePrProbeResult
      setProbe(next)
    } catch {
      setProbe(EMPTY)
    } finally {
      setLoading(false)
    }
  }, [enabled, workspaceId])

  useEffect(() => {
    void reload()
  }, [reload])

  const canOpen = probe.reason === "ok"
  const needsAuth = probe.reason === "not-authed"

  return { probe, loading, reload, canOpen, needsAuth }
}
