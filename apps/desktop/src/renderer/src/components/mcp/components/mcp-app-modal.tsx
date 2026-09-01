/**
 * MCP 隔离 App 查看器模态框：
 * 渲染受限沙箱 iframe，并提供实时 IPC 回显日志展示。
 */
import { RiCommandLine, RiCpuLine, RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
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

  if (!appSrcDoc) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-3xl border-border-button-default bg-background-primary-default shadow-2xl">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between border-b border-separator-border/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <RiCpuLine className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-body-medium font-semibold text-text-primary">
                {appTitle} · Sandboxed App
              </DialogTitle>
              <p className="text-[12px] text-text-secondary">
                受限沙箱（无 Node、connect-src none），所有外部通信经主进程严格消毒。
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
              <span>重新加载</span>
            </Button>
          </div>
        </div>

        {/* 主体 iframe 区域 */}
        <div className="p-6 bg-background-secondary-default/30 flex flex-col gap-4">
          <McpAppFrame srcDoc={appSrcDoc} title={appTitle} onAppMessage={onAppMessage} />

          {/* 实时 IPC 日志回显 */}
          <div className="flex items-center gap-2 rounded-2xl border border-separator-border/80 bg-background-primary-default p-3.5 shadow-xs">
            <RiCommandLine className="size-4 shrink-0 text-text-tertiary" />
            <div className="flex-1 min-w-0">
              <p
                data-testid="mcp-app-log-text"
                className="font-mono text-caption-2-medium text-text-secondary truncate"
              >
                Live IPC Echo: {lastLog ?? "等待 App 事件中..."}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
