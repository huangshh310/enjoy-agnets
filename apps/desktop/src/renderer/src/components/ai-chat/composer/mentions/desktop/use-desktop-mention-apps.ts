/**
 * 拉取本机可枚举应用，与 desktop_list_apps 同源。失败则空列表，不造假应用。
 */
import { useEffect, useState } from "react"
import type { DesktopMentionApp } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useComputerUseEnabled } from "@renderer/hooks/use-computer-use-enabled"

export function useDesktopMentionApps(): DesktopMentionApp[] {
  const enabled = useComputerUseEnabled()
  const [apps, setApps] = useState<DesktopMentionApp[]>([])

  useEffect(() => {
    if (!enabled || !hasIde()) {
      setApps([])
      return
    }
    let cancelled = false
    void getIde()
      .builtinTools.desktopListApps()
      .then((result) => {
        if (!cancelled) setApps(Array.isArray(result?.apps) ? result.apps : [])
      })
      .catch(() => {
        if (!cancelled) setApps([])
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return apps
}
