/**
 * 主进程截完图后贴到 Composer。连续截图进同一份草稿。
 */
import { useEffect } from "react"
import { hasIde, getIde } from "@renderer/lib/ide"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { attachAppsnapPng } from "./appsnap-attach"
import { playShutter } from "./appsnap-sound"

export function useAppsnapInbox(): void {
  const sound = useSettingsSnapshot().data?.preferences.appsnapSound
  useEffect(() => {
    if (!hasIde()) return
    const stop = getIde().appsnap.onCaptured((payload) => {
      void attachAppsnapPng(payload.pngBase64)
      if (sound !== false) playShutter()
    })
    return () => {
      stop()
    }
  }, [sound])
}
