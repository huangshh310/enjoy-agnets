/**
 * Mermaid 流程图全屏弹窗：支持按键 ESC、滚轮缩放、还原与源码复制。
 */
import { useState } from "react"
import {
  RiAddLine,
  RiCheckLine,
  RiClipboardLine,
  RiRestartLine,
  RiSubtractLine
} from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { useT } from "@renderer/i18n"

export function MermaidDialog({
  open,
  onOpenChange,
  svg,
  code
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  svg: string
  code: string
}) {
  const t = useT()
  const [scale, setScale] = useState(1)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  const handleZoomIn = () => setScale((s) => Math.min(3, s + 0.2))
  const handleZoomOut = () => setScale((s) => Math.max(0.4, s - 0.2))
  const handleReset = () => setScale(1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-separator-border pb-3">
          <DialogTitle className="text-title-3-semibold text-text-primary">
            Mermaid Diagram
          </DialogTitle>
          <div className="flex items-center gap-1">
            <QuietIconButton
              icon={RiSubtractLine}
              aria-label="Zoom out"
              onClick={handleZoomOut}
            />
            <span className="w-12 text-center text-caption-1-medium text-text-secondary tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <QuietIconButton
              icon={RiAddLine}
              aria-label="Zoom in"
              onClick={handleZoomIn}
            />
            <QuietIconButton
              icon={RiRestartLine}
              aria-label="Reset zoom"
              onClick={handleReset}
            />
            <QuietIconButton
              icon={copied ? RiCheckLine : RiClipboardLine}
              aria-label={copied ? t("common.copied") : t("chat.copySnippet")}
              onClick={handleCopy}
            />
          </div>
        </DialogHeader>
        <div className="relative flex flex-1 items-center justify-center overflow-auto p-4">
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform 0.15s ease-out" }}
            className="flex items-center justify-center max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
