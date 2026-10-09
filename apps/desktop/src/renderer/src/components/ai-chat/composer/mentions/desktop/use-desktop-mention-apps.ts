/**
 * 拉取本机可枚举应用，与 desktop_list_apps 同源。
 * 空态 pill 只在开关开且权限就绪后出现；首帧不吃缓存，避免闪一枚假 pill。
 */
import { useEffect, useState } from "react"
import type { DesktopMentionApp } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useComputerUseEnabled } from "@renderer/hooks/use-computer-use-enabled"
import {
  mentionAppsFromListResult,
  rememberDesktopMentionApps
} from "./mention-apps-from-list.ts"

export function useDesktopMentionApps(): DesktopMentionApp[] {
  const enabled = useComputerUseEnabled()
  const [apps, setApps] = useState<DesktopMentionApp[]>([])

  useEffect(() => {
    if (!enabled || !hasIde()) {
      rememberDesktopMentionApps([])
      setApps([])
      return
    }
    let cancelled = false
    void loadReadyMentionApps().then((next) => {
      if (cancelled) return
      rememberDesktopMentionApps(next)
      setApps(next)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return apps
}

async function loadReadyMentionApps(): Promise<DesktopMentionApp[]> {
  try {
    const state = await getIde().builtinTools.getState()
    const desktop = state.computerUse
    if (!desktop.enabled || !desktop.accessibilityGranted || !desktop.screenCaptureGranted) {
      return []
    }
    return mentionAppsFromListResult(await getIde().builtinTools.desktopListApps())
  } catch {
    return []
  }
}
