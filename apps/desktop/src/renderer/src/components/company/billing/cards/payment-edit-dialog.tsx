/**
 * 本地支付草稿编辑：只改本页 state，不宣称 OS 密钥核验。
 */
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PaymentMethodInfo } from "../billing.types"

interface PaymentEditDialogProps {
  open: boolean
  payment: PaymentMethodInfo
  onOpenChange: (open: boolean) => void
  onSave: (payment: PaymentMethodInfo) => void
}

export function PaymentEditDialog({
  open,
  payment,
  onOpenChange,
  onSave
}: PaymentEditDialogProps) {
  const [draft, setDraft] = useState(payment)

  useEffect(() => {
    if (open) setDraft(payment)
  }, [open, payment])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-separator-border bg-background-primary-default sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-title-3-semibold text-text-primary">更新支付方式</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-caption-2-medium text-text-secondary">卡组织</span>
            <Input
              value={draft.brand}
              onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption-2-medium text-text-secondary">尾号 4 位</span>
            <Input
              value={draft.last4}
              maxLength={4}
              onChange={(event) =>
                setDraft((current) => ({ ...current, last4: event.target.value.replace(/\D/g, "").slice(0, 4) }))
              }
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption-2-medium text-text-secondary">有效期</span>
            <Input
              value={draft.expiry}
              placeholder="08/29"
              onChange={(event) => setDraft((current) => ({ ...current, expiry: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption-2-medium text-text-secondary">账单邮箱</span>
            <Input
              value={draft.billingEmail}
              onChange={(event) =>
                setDraft((current) => ({ ...current, billingEmail: event.target.value }))
              }
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={() => onSave(draft)}>
            保存到本页
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
