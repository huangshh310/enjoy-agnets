/**
 * MCP 批量导入 / 导出 JSON 模态框：
 * 深度兼容 Claude Desktop (claude_desktop_config.json)、Cursor 与 Cline 格式。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiFileCodeLine,
  RiInformationLine,
  RiLoader4Line,
  RiUpload2Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"

export function McpJsonImportModal(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentServers: McpServer[]
  onChanged: () => Promise<void>
}) {
  const { open, onOpenChange, currentServers, onChanged } = props
  const [jsonText, setJsonText] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importReport, setImportReport] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // 生成当前全部 Server 的导出配置 JSON
  function generateExportJson() {
    const mcpServers: Record<string, unknown> = {}
    for (const server of currentServers) {
      if (server.transport === "stdio") {
        const parts = (server.command ?? "").split(" ").filter(Boolean)
        const cmd = parts[0] || "npx"
        const args = parts.slice(1)
        let env: Record<string, string> | undefined = undefined
        if (server.envRef) {
          try {
            env = JSON.parse(server.envRef) as Record<string, string>
          } catch {
            // ignore
          }
        }
        mcpServers[server.name] = {
          command: cmd,
          args,
          ...(env ? { env } : {})
        }
      } else {
        mcpServers[server.name] = {
          url: server.url,
          transport: server.transport
        }
      }
    }
    return JSON.stringify({ mcpServers }, null, 2)
  }

  function handleCopyExport() {
    const text = generateExportJson()
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleExecuteImport() {
    if (!jsonText.trim()) return
    setIsImporting(true)
    setImportReport(null)
    try {
      const parsed = JSON.parse(jsonText) as {
        mcpServers?: Record<
          string,
          {
            command?: string
            args?: string[]
            env?: Record<string, string>
            url?: string
            transport?: "stdio" | "sse" | "http"
          }
        >
      }

      const serversObj = parsed.mcpServers ?? parsed
      let count = 0

      for (const [name, config] of Object.entries(serversObj)) {
        if (!config || typeof config !== "object") continue
        const hasUrl = Boolean((config as { url?: string }).url)
        const transport = hasUrl
          ? (config as { transport?: "sse" | "http" }).transport ?? "sse"
          : "stdio"

        let command: string | undefined = undefined
        if (transport === "stdio") {
          const rawCmd = (config as { command?: string }).command ?? "npx"
          const rawArgs = (config as { args?: string[] }).args ?? []
          command = [rawCmd, ...rawArgs].join(" ")
        }

        const env = (config as { env?: Record<string, string> }).env
        const envRef = env ? JSON.stringify(env) : undefined

        await getIde().mcp.upsert({
          name,
          transport,
          command,
          url: (config as { url?: string }).url,
          envRef,
          allowedResourceUris: [],
          modelVisibleTools: [],
          appOnlyTools: [],
          trusted: false
        })
        count++
      }

      await onChanged()
      setImportReport(`成功导入并注册 ${count} 台 MCP Server！`)
      setJsonText("")
    } catch (err: unknown) {
      setImportReport(`导入失败: ${err instanceof Error ? err.message : "JSON 格式不正确"}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border-border-button-default bg-background-primary-default shadow-2xl">
        <div className="flex items-center justify-between border-b border-separator-border/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
              <RiFileCodeLine className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-body-medium font-semibold text-text-primary">
                MCP 格式导入 / 导出
              </DialogTitle>
              <p className="text-[12px] text-text-secondary">
                支持 Claude Desktop、Cursor 与 Cline 标准 JSON 格式一键无缝导入。
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6 max-h-[75vh] overflow-y-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-caption-2-medium font-semibold text-text-primary">
                粘贴 MCP 配置 JSON (JSON Spec)
              </span>
              <button
                type="button"
                onClick={handleCopyExport}
                className="inline-flex items-center gap-1 text-[11px] text-accent-600 dark:text-accent-400 hover:underline"
              >
                {copied ? (
                  <>
                    <RiCheckLine className="size-3 text-emerald-500" />
                    <span>已复制当前配置</span>
                  </>
                ) : (
                  <>
                    <RiClipboardLine className="size-3" />
                    <span>复制当前已配置 JSON</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={8}
              placeholder={`{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]\n    }\n  }\n}`}
              className="w-full font-mono text-[12px] rounded-2xl border border-separator-border/80 bg-background-secondary-default p-3 text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500 leading-relaxed"
            />
          </div>

          {importReport ? (
            <div
              className={cx(
                "rounded-xl border p-3 text-[12px]",
                importReport.includes("成功")
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                  : "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400"
              )}
            >
              {importReport}
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-xl bg-background-secondary-default/50 p-3 text-[11px] text-text-secondary">
            <RiInformationLine className="size-4 shrink-0 text-text-tertiary" />
            <span>
              导入的 Server 将默认以沙箱安全模式（Untrusted）注册，工具将在主进程中安全管控。
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-separator-border/80 px-6 py-3.5 bg-background-secondary-default/30">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            关闭
          </Button>

          <Button
            size="sm"
            disabled={!jsonText.trim() || isImporting}
            onClick={() => void handleExecuteImport()}
            className="gap-1.5 shadow-xs"
          >
            {isImporting ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiUpload2Line className="size-3.5" />
            )}
            <span>解析并批量导入</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
