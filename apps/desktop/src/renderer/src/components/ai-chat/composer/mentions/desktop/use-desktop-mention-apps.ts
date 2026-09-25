/**
 * 拉取本机可枚举应用，与 desktop_list_apps 同源。失败则空列表，不造假应用。
 */
import { useEffect, useState } from "react"
import type { DesktopMentionApp } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useComputerUseEnabled } from "@renderer/hooks/use-computer-use-enabled"
import {
  mentionAppsFromListResult,
  peekDesktopMentionApps,
  rememberDesktopMentionApps
} from "./mention-apps-from-list.ts"

export function useDesktopMentionApps(): DesktopMentionApp[] {
  const enabled = useComputerUseEnabled()
  const [apps, setApps] = useState<DesktopMentionApp[]>([...peekDesktopMentionApps()])

  useEffect(() => {
    if (!enabled || !hasIde()) {
      rememberDesktopMentionApps([])
      setApps([])
      return
    }
    let cancelled = false
    void getIde()
      .builtinTools.desktopListApps()
      .then((result) => {
        const next = mentionAppsFromListResult(result)
        if (cancelled) return
        rememberDesktopMentionApps(next)
        setApps(next)
      })
      .catch(() => {
        if (cancelled) return
        rememberDesktopMentionApps([])
        setApps([])
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return apps
}
