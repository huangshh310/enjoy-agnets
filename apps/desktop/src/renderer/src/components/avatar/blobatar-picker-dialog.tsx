/**
 * Universal Blobatar 独立弹窗选择器组件：
 * 封装 Dialog 模态层，方便在任何需要选择或更新头像的地方一键调用。
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BlobatarPicker } from "./blobatar-picker"
import { DEFAULT_BLOBATAR_CONFIG, type BlobatarConfig } from "./blobatar.types"

export interface BlobatarPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: BlobatarConfig
  onSave: (config: BlobatarConfig) => void
  title?: string
}

export function BlobatarPickerDialog({
  open,
  onOpenChange,
  value = DEFAULT_BLOBATAR_CONFIG,
  onSave,
  title = "选择与定制几何头像"
}: BlobatarPickerDialogProps) {
  const [draft, setDraft] = useState<BlobatarConfig>(value)

  useEffect(() => {
    if (open) {
      setDraft(value)
    }
  }, [open, value])

  function handleConfirm() {
    onSave(draft)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-separator-border shadow-card bg-background-primary-default sm:rounded-2xl select-none">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-separator-border/60">
          <DialogTitle className="text-title-3-semibold text-text-primary">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 max-h-[72vh] overflow-y-auto">
          <BlobatarPicker value={draft} onChange={setDraft} />
        </div>

        <DialogFooter className="px-5 py-3 border-t border-separator-border/60 bg-background-secondary-default/30">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            应用头像
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
