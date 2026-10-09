/**
 * MCP 隔离 App 查看器模态框：
 * 渲染受限沙箱 iframe，并提供实时 IPC 回显日志展示。
 */
import { useEffect } from "react"
import { RiCloseLine, RiCommandLine, RiCpuLine, RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { McpAppFrame } from "../mcp-app-frame"

export function McpAppModal(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appTitle: string
  appSrcDoc: string | null
  lastLog: string | null
  onAppMessage: (raw: unknown) => void
  onRefreshApp: () => void
}) {
  const { open, onOpenChange, appTitle, appSrcDoc, lastLog, onAppMessage, onRefreshApp } = props
  const t = useT()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-label={t("common.close") || "Close"}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-app-drawer-title"
        className="absolute inset-y-3 right-3 flex w-[min(56rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card animate-in slide-in-from-right duration-200"
      >
        {/* 顶部工具栏 */}
        <header className="flex items-center justify-between border-b border-separator-border/80 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-chart-5/10 text-chart-5 dark:text-chart-5">
              <RiCpuLine className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 id="mcp-app-drawer-title" className="text-title-3-semibold text-text-primary tracking-tight truncate">
                {t("pages.mcp.sandboxedApp", { title: appTitle })}
              </h3>
              <p className="text-caption-2-regular text-text-tertiary truncate">
                {t("pages.mcp.sandboxHint")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRefreshApp}
              className="gap-1 h-7.5 text-caption-2-medium"
            >
              <RiRefreshLine className="size-3.5" />
              <span>{t("pages.mcp.reload")}</span>
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
              aria-label={t("common.close") || "Close"}
            >
              <RiCloseLine className="size-5" />
            </button>
          </div>
        </header>

        {/* 主体 iframe 区域 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-background-secondary-default/30 flex flex-col gap-4">
          {appSrcDoc ? (
            <div className="flex-1 min-h-[400px] flex flex-col">
              <McpAppFrame srcDoc={appSrcDoc} title={appTitle} onAppMessage={onAppMessage} />
            </div>
          ) : (
            <p className="rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 text-caption-1-medium text-text-secondary">
              {t("pages.mcp.appUnavailable")}
            </p>
          )}

          {/* 实时 IPC 日志回显 */}
          <div className="flex items-center gap-2 rounded-2xl border border-separator-border/80 bg-background-primary-default p-3.5 shadow-xs shrink-0">
            <RiCommandLine className="size-4 shrink-0 text-text-tertiary" />
            <div className="flex-1 min-w-0">
              <p
                data-testid="mcp-app-log-text"
                className="font-mono text-caption-2-medium text-text-secondary truncate"
              >
                {t("pages.mcp.liveIpc", { log: lastLog ?? t("pages.mcp.waitingApp") })}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
