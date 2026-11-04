/**
 * Composer 同槽只读预览：复用气泡 MarkdownResponse（含 #205 Shiki 围栏体感）。
 * 只读看渲；改字必须切回源码。CommandFence「运行」仅为气泡同款标签、非可点执行。
 */
import { useEffect, useRef } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { MarkdownResponse } from "../thread/markdown-response"

export function ComposerPreviewPane({
  markdown,
  onExitPreview,
  className
}: {
  markdown: string
  onExitPreview: () => void
  className?: string
}) {
  const t = useT()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const trimmed = markdown.trim()

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-label={t("chat.composerPreview")}
      data-testid="composer-preview-pane"
      data-composer-preview=""
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          onExitPreview()
        }
      }}
      className={cx(
        "relative max-h-48 min-h-[38px] overflow-y-auto px-3.5 py-1 outline-none",
        className
      )}
    >
      {trimmed ? (
        <div
          className="pointer-events-auto select-text"
          // 预览只读：拦截输入类事件，保留复制/滚动；不进编辑。
          onBeforeInput={(event) => event.preventDefault()}
          onCut={(event) => event.preventDefault()}
          onPaste={(event) => event.preventDefault()}
        >
          <MarkdownResponse>{markdown}</MarkdownResponse>
        </div>
      ) : (
        <p
          data-testid="composer-preview-empty"
          className="py-1 text-body-medium text-text-secondary/70"
        >
          {t("chat.composerPreviewEmpty")}
        </p>
      )}
    </div>
  )
}
