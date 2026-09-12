/**
 * 点「在浏览器打开」：调 main openExternal，成功再亮 toast。
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { openPreviewInBrowser } from "./open-preview-in-browser"
import type { PreviewTarget } from "./preview-open.types"

const TOAST_MS = 2400

export function useOpenSessionPreview() {
  const [busy, setBusy] = useState(false)
  const [opened, setOpened] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    }
  }, [])

  const open = useCallback(async (target: PreviewTarget) => {
    const workspaceId = useChatStore.getState().workspaceId
    if (!workspaceId) return
    setBusy(true)
    try {
      const ok = await openPreviewInBrowser(workspaceId, target)
      if (!ok) return
      setOpened(true)
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setOpened(false), TOAST_MS)
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, opened, open }
}
