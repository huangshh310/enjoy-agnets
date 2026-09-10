/**
 * 应用内确认框。不要用 window.confirm / Electron 原生框，标题会变成包名。
 */
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useT } from "@renderer/i18n"

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
  onConfirm: () => void
}) {
  const t = useT()
  const confirmText = confirmLabel ?? t("studio.confirm")
  const cancelText = cancelLabel ?? t("common.cancel")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
        <DialogHeader>
          <DialogTitle className="text-title-3-semibold text-text-primary">{title}</DialogTitle>
          <DialogDescription className="text-body-medium text-text-secondary">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children ? <div className="mt-3">{children}</div> : null}
        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onConfirm()
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
