/**
 * 屏幕感知透视面板 (Midscene.js 风格视觉回显)
 * 呈现智能体捕获的屏幕缩略图与已识别的窗口及可交互控件。
 */
import { RiCloseLine, RiRefreshLine, RiWindowLine, RiCursorLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export type DesktopViewElement = {
  id: string
  role: string
  name: string
  clickable: boolean
}

export type DesktopView = {
  observationId: string
  appName: string
  appKey?: string
  elements: DesktopViewElement[]
  thumbnailDataUrl?: string
}

export function DesktopPerceptionInspector({
  open,
  onClose,
  onRecapture,
  capturing,
  thumbnailDataUrl,
  view
}: {
  open: boolean
  onClose: () => void
  onRecapture: () => void
  capturing: boolean
  thumbnailDataUrl?: string
  view?: DesktopView | null
}) {
  const t = useT()

  if (!open) return null

  const elements = view?.elements ?? []
  const count = elements.length

  return (
    <div
      data-testid="desktop-perception-inspector"
      className="flex flex-col gap-3 rounded-xl border border-border-button-default bg-background-secondary-default/60 p-4 transition-all"
    >
      {/* 顶栏元信息与操作 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-button-default/60 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {view?.appName ? (
            <div className="flex items-center gap-1.5 rounded-md bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-primary ring-1 ring-border-button-default">
              <RiWindowLine className="size-3.5 text-text-tertiary" aria-hidden />
              <span>{t("settings.builtinTools.perceptionTargetWindow")}:</span>
              <span className="font-semibold">{view.appName}</span>
              {view.appKey ? (
                <span className="font-mono text-caption-2 text-text-tertiary">({view.appKey})</span>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-1 rounded-md bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-secondary ring-1 ring-border-button-default">
            <RiCursorLine className="size-3.5 text-text-tertiary" aria-hidden />
            <span>{t("settings.builtinTools.perceptionDetected", { count })}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRecapture}
            disabled={capturing}
            className="h-7 gap-1.5 rounded-lg px-2.5 text-caption-2-medium"
          >
            <RiRefreshLine className={`size-3.5 ${capturing ? "animate-spin" : ""}`} aria-hidden />
            {t("settings.builtinTools.captureScreen")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 rounded-lg p-0 text-text-tertiary hover:text-text-primary"
            aria-label={t("settings.builtinTools.dismiss")}
          >
            <RiCloseLine className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* 视口与控件识别面板 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* 缩略图视口 */}
        <div className="flex flex-col gap-1.5">
          <div className="relative flex min-h-[160px] max-h-[260px] items-center justify-center overflow-hidden rounded-lg border border-border-button-default bg-background-tertiary-default/20 p-2">
            {thumbnailDataUrl ? (
              <img
                src={thumbnailDataUrl}
                alt={view?.appName ?? "Screen capture"}
                className="max-h-[240px] w-full rounded object-contain shadow-xs transition-transform hover:scale-[1.02]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
                <p className="text-caption-1-medium text-text-tertiary">
                  {t("settings.builtinTools.perceptionEmpty")}
                </p>
                <p className="text-caption-2-medium text-text-tertiary/80">
                  点击上方「{t("settings.builtinTools.captureScreen")}」捕获当前屏幕
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 控件识别悬浮标签 (Midscene.js 标签透视) */}
        <div className="flex flex-col gap-2 rounded-lg border border-border-button-default bg-background-primary-default p-3">
          <div className="flex items-center justify-between border-b border-border-button-default/50 pb-1.5">
            <span className="text-caption-2-semibold text-text-primary">
              {t("settings.builtinTools.perceptionDetected", { count })}
            </span>
            <span className="text-caption-2 text-text-tertiary font-mono">
              {elements.length > 12 ? `展示前 12 / ${elements.length}` : `共 ${elements.length}`}
            </span>
          </div>

          {elements.length > 0 ? (
            <div className="flex max-h-[200px] flex-wrap content-start gap-1.5 overflow-y-auto pr-1">
              {elements.slice(0, 12).map((elem) => (
                <div
                  key={elem.id}
                  className="flex items-center gap-1 rounded border border-border-button-default/80 bg-background-secondary-default/50 px-2 py-0.5 text-caption-2 text-text-secondary"
                >
                  <span className="max-w-[120px] truncate font-medium text-text-primary" title={elem.name}>
                    {elem.name || `#${elem.id}`}
                  </span>
                  <span className="rounded bg-background-tertiary-default px-1 py-0.2 font-mono text-[10px] text-text-tertiary">
                    {elem.role}
                  </span>
                  {elem.clickable ? (
                    <span className="size-1.5 rounded-full bg-state-success-base" title="clickable" />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center">
              <p className="text-caption-2-medium text-text-tertiary">
                尚未提取到独立控件元素
              </p>
              <p className="text-caption-2 text-text-tertiary/70">
                运行 @桌面 任务时，智能体将在此实时呈现视觉定位锚点
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
