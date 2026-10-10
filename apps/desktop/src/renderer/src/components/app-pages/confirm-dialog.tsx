/**
 * 应用内确认框。不要用 window.confirm / Electron 原生框，标题会变成包名。
 * 确认成功才关框；onConfirm 抛错则留着，禁止静默关掉。
 * Enter 走 form submit；Tab 到确认钮再 Enter 与鼠标点同一条路径。
 */
import { useState, type FormEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useT } from "@renderer/i18n"
import { SETTINGS_DRAWER_Z_CLASS } from "@renderer/components/settings/settings-overlay"

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  children,
  onOpenChange,
  onConfirm
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  children?: ReactNode
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const confirmText = confirmLabel ?? t("studio.confirm")
  const cancelText = cancelLabel ?? t("common.cancel")

  async function submitConfirm(event?: FormEvent): Promise<void> {
    event?.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await Promise.resolve(onConfirm())
      onOpenChange(false)
    } catch {
      // 调用方 toast；框留着
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="confirm-dialog"
        showCloseButton={false}
        overlayClassName={cx(SETTINGS_DRAWER_Z_CLASS.modal, "fixed inset-0")}
        className={cx(
          SETTINGS_DRAWER_Z_CLASS.modal,
          "fixed top-1/2 left-1/2 max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card"
        )}
      >
        <form onSubmit={(event) => void submitConfirm(event)}>
          <DialogHeader>
            <DialogTitle className="text-title-3-semibold text-text-primary">{title}</DialogTitle>
            <DialogDescription
              className={
                description
                  ? "text-body-medium text-text-secondary"
                  : "sr-only"
              }
            >
              {description || title}
            </DialogDescription>
          </DialogHeader>
          {children ? <div className="mt-3">{children}</div> : null}
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
              {cancelText}
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              size="sm"
              disabled={busy}
              data-testid="confirm-dialog-confirm"
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
