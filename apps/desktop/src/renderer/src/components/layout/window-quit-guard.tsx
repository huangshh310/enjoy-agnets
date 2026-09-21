/**
 * 跑中或等审批时拦截关窗 / ⌘Q。确认后才 forceQuit。
 */
import { useEffect, useState } from "react"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { needsQuitConfirm } from "@renderer/lib/quit-guard"
import { closeWindow, forceQuitWindow, onQuitRequested } from "@renderer/lib/window-control"
import { useT } from "@renderer/i18n"

function busyNow(): boolean {
  const chat = useChatStore.getState()
  const attention = useAttentionStore.getState()
  return needsQuitConfirm({
    running: chat.running,
    pendingApproval: chat.pendingApproval,
    parks: attention.parks,
    attention: attention.items
  })
}

export function WindowQuitGuard() {
  const t = useT()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const offIpc = onQuitRequested(() => {
      if (!busyNow()) {
        void forceQuitWindow()
        return
      }
      setOpen(true)
    })
    const onLocal = () => {
      if (!busyNow()) {
        void closeWindow()
        return
      }
      setOpen(true)
    }
    window.addEventListener("enjoy-quit-requested", onLocal)
    return () => {
      offIpc()
      window.removeEventListener("enjoy-quit-requested", onLocal)
    }
  }, [])

  return (
    <ConfirmDialog
      open={open}
      title={t("studio.window.quitBusyTitle")}
      description={t("studio.window.quitBusyDesc")}
      confirmLabel={t("studio.window.quitAnyway")}
      destructive
      onOpenChange={setOpen}
      onConfirm={() => {
        setOpen(false)
        void forceQuitWindow()
      }}
    />
  )
}

/** 标题栏关闭：空闲直接关窗；忙则弹出与 ⌘Q 同一确认框。 */
export function requestCloseWindow(): void {
  window.dispatchEvent(new Event("enjoy-quit-requested"))
}
