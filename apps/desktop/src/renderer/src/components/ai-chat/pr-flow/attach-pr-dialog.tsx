/**
 * 「挂上这个 PR」= attach-only：list 同仓 PR → 选一条写入 SQLite SoT。
 * 禁夹带 create 副作用（Must#4）。
 */
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { SETTINGS_DRAWER_Z_CLASS } from "@renderer/components/settings/settings-overlay"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import type { AttachedPrItem } from "@enjoy-agents/ipc-contract"
import { useAttachedPrs } from "./use-attached-prs"

export function AttachPrDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  workspaceId: string | null
}) {
  const t = useT()
  const { attach, reload } = useAttachedPrs(props.sessionId)
  const [items, setItems] = useState<AttachedPrItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emptyHint, setEmptyHint] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    setError(null)
    setEmptyHint(null)
    if (!props.workspaceId || !hasIde()) {
      setItems([])
      setEmptyHint(t("chat.prAttachNoRepo"))
      return
    }
    setLoading(true)
    void (async () => {
      try {
        const res = (await getIde().workspace.prList({
          workspaceId: props.workspaceId
        })) as { ok: boolean; items?: AttachedPrItem[]; message?: string }
        if (!res.ok) {
          setItems([])
          setEmptyHint(res.message || t("chat.prAttachListFailed"))
          return
        }
        const next = res.items ?? []
        setItems(next)
        if (next.length === 0) setEmptyHint(t("chat.prAttachEmpty"))
      } catch {
        setItems([])
        setEmptyHint(t("chat.prAttachListFailed"))
      } finally {
        setLoading(false)
      }
    })()
  }, [props.open, props.workspaceId, t])

  async function onPick(item: AttachedPrItem) {
    if (!props.workspaceId || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await attach({
        workspaceId: props.workspaceId,
        number: item.number,
        url: item.url,
        title: item.title,
        makePrimary: true
      })
      if (!res.ok) {
        setError(("reason" in res && res.reason) || t("chat.prAttachFailed"))
        return
      }
      await reload()
      props.onOpenChange(false)
    } catch {
      setError(t("chat.prAttachFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        data-testid="attach-pr-dialog"
        showCloseButton={false}
        overlayClassName={cx(SETTINGS_DRAWER_Z_CLASS.modal, "fixed inset-0")}
        className={cx(
          SETTINGS_DRAWER_Z_CLASS.modal,
          "fixed inset-0 left-0 top-0 flex h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center border-0 bg-transparent p-0 shadow-none"
        )}
      >
        <div className="w-full max-w-md rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
          <DialogHeader className="mb-3 space-y-1 text-left">
            <DialogTitle className="text-body-medium font-semibold text-text-primary">
              {t("chat.prAttachTitle")}
            </DialogTitle>
            <DialogDescription className="text-caption-1-medium text-text-secondary">
              {t("chat.prAttachHint")}
            </DialogDescription>
          </DialogHeader>

          <div className="mb-3 max-h-64 overflow-y-auto rounded-xl border border-separator-border">
            {loading ? (
              <p className="px-3 py-4 text-caption-1-medium text-text-tertiary">{t("chat.prAttachLoading")}</p>
            ) : emptyHint ? (
              <p data-testid="attach-pr-empty" className="px-3 py-4 text-caption-1-medium text-text-secondary">
                {emptyHint}
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.number}
                  type="button"
                  data-testid={`attach-pr-item-${item.number}`}
                  disabled={busy}
                  onClick={() => void onPick(item)}
                  className="flex w-full cursor-pointer items-center gap-2 border-b border-separator-border/60 px-3 py-2.5 text-left last:border-b-0 hover:bg-background-secondary-hover disabled:opacity-50"
                >
                  <span className="font-mono text-caption-1-medium text-accent-500">#{item.number}</span>
                  <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">
                    {item.title || `PR #${item.number}`}
                  </span>
                </button>
              ))
            )}
          </div>

          {error ? (
            <p data-testid="attach-pr-error" className="mb-3 text-caption-1-medium text-text-error-primary">
              {error}
            </p>
          ) : null}

          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => props.onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
