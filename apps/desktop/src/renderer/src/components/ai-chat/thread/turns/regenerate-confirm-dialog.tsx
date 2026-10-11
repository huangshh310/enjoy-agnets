/**
 * 重新生成**非最后一条**回复：先告诉用户后面几轮会删掉（jojo P1；样式沿用「从这里重来」对话框）。
 * 确认后从这一轮截断并重跑这一轮；不还原文件。
 */
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

export function RegenerateConfirmDialog({
  open,
  laterTurns,
  onConfirm,
  onOpenChange
}: {
  open: boolean
  laterTurns: number
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="regenerate-confirm-dialog"
        className="max-w-sm rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card"
      >
        <DialogHeader>
          <DialogTitle className="text-title-3-semibold text-text-primary">
            {t("chat.regenerateMiddleTitle")}
          </DialogTitle>
          <DialogDescription className="text-body-medium text-text-secondary">
            {t("chat.regenerateMiddleBody", { n: laterTurns })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            data-testid="regenerate-confirm"
            onClick={() => {
              onOpenChange(false)
              onConfirm()
            }}
          >
            {t("chat.regenerateMiddleConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
