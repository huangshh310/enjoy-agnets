/**
 * 点「在浏览器打开」：走 workspace.openPreview，成功再亮全局 toast。
 */
import { useCallback, useState } from "react"
import { useT } from "@renderer/i18n"
import { showAppToast } from "@renderer/lib/app-toast"
import { useChatStore } from "@renderer/stores/chat-store"
import { openPreviewInBrowser } from "./open-preview-in-browser"
import type { PreviewTarget } from "./preview-open.types"

export function useOpenSessionPreview() {
  const t = useT()
  const [busy, setBusy] = useState(false)

  const open = useCallback(async (target: PreviewTarget) => {
    const workspaceId = useChatStore.getState().workspaceId
    if (!workspaceId) return
    setBusy(true)
    try {
      const ok = await openPreviewInBrowser(workspaceId, target)
      if (!ok) return
      showAppToast(t("chat.sessionReviewOpenPreviewDone"), {
        id: "session-preview-toast",
        tone: "success"
      })
    } finally {
      setBusy(false)
    }
  }, [t])

  return { busy, open }
}
