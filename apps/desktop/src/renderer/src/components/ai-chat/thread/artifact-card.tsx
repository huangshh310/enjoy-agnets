/**
 * 产物薄卡（#117）：助手轮一张人话卡 →「在右侧打开」进已有右栏。
 * 不做版本时间线；默认不写「第 N 版」；写入中不给假预览。
 */
import { RiArrowRightUpLine, RiFileCodeLine, RiGlobeLine, RiLoader4Line } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { openBrowserUrl, revealRightPane } from "../right-pane/open-pane"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { parseHttpUrl } from "@renderer/lib/http-url"

export type ArtifactCardModel = {
  title: string
  kind: "web" | "file"
  /** 写入中：只显示态，不给打开 */
  writing?: boolean
  url?: string
  path?: string
}

export function ArtifactCard({ model, className }: { model: ArtifactCardModel; className?: string }) {
  const t = useT()
  const kindLabel = model.kind === "web" ? t("chat.artifactWeb") : t("chat.artifactFile")
  const Icon = model.writing ? RiLoader4Line : model.kind === "web" ? RiGlobeLine : RiFileCodeLine

  function open() {
    if (model.writing) return
    if (model.url && parseHttpUrl(model.url)) {
      openBrowserUrl(model.url)
      return
    }
    if (model.path) {
      void openChangedFile(model.path)
      return
    }
    revealRightPane(model.kind === "web" ? "browser" : "files")
  }

  return (
    <div
      data-testid="artifact-card"
      className={cx(
        "mt-2 flex max-w-sm items-center gap-2.5 rounded-xl border border-separator-border/80 bg-background-secondary-default/60 px-3 py-2.5 shadow-2xs",
        className
      )}
    >
      <span
        className={cx(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-primary-default text-accent-500",
          model.writing && "text-text-tertiary"
        )}
      >
        <Icon className={cx("size-4", model.writing && "animate-spin")} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-caption-1-semibold text-text-primary" title={model.title}>
          {model.title}
        </p>
        <p className="text-caption-2-regular text-text-tertiary">
          {model.writing ? t("chat.artifactWriting") : kindLabel}
        </p>
      </div>
      {model.writing ? null : (
        <button
          type="button"
          onClick={open}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border-button-default bg-background-primary-default px-2 py-1 text-caption-2-medium text-text-primary hover:border-accent-500 hover:text-accent-600"
        >
          {t("chat.artifactOpenRight")}
          <RiArrowRightUpLine className="size-3.5" />
        </button>
      )}
    </div>
  )
}
