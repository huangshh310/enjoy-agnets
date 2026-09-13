/**
 * Mermaid 原生渲染围栏：实时渲染 SVG，支持全屏 Dialog 放大与回退代码块。
 */
import { useEffect, useState, type ReactNode } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiExpandDiagonalLine
} from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { useT } from "@renderer/i18n"
import { MermaidDialog } from "./mermaid-dialog"
import { renderMermaidSvg } from "./render-mermaid"

export function MermaidFence({
  code,
  fallback
}: {
  code: string
  fallback: ReactNode
}) {
  const t = useT()
  const [svg, setSvg] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setHasError(false)

    renderMermaidSvg(code)
      .then((renderedSvg) => {
        if (!cancelled) {
          setSvg(renderedSvg)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("Mermaid render failed, falling back to code snippet:", err)
          setHasError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [code])

  if (hasError) {
    return <>{fallback}</>
  }

  const handleCopy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default">
      <div className="flex items-center gap-2 border-b border-separator-border px-3 py-2">
        <span className="rounded-md bg-background-tertiary-default px-1.5 py-0.5 text-caption-1-semibold lowercase text-text-secondary">
          mermaid
        </span>
        <span className="flex-1" />
        {svg ? (
          <QuietIconButton
            icon={RiExpandDiagonalLine}
            aria-label="Full screen"
            onClick={() => setDialogOpen(true)}
          />
        ) : null}
        <QuietIconButton
          icon={copied ? RiCheckLine : RiClipboardLine}
          aria-label={copied ? t("common.copied") : t("chat.copySnippet")}
          onClick={handleCopy}
        />
      </div>

      <div className="flex min-h-24 items-center justify-center overflow-x-auto p-4">
        {loading ? (
          <div className="text-caption-1-medium text-text-tertiary">Rendering diagram…</div>
        ) : svg ? (
          <div
            className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null}
      </div>

      {svg ? (
        <MermaidDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          svg={svg}
          code={code}
        />
      ) : null}
    </div>
  )
}
