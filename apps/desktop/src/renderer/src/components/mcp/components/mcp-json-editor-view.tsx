/**
 * MCP 规格 JSON 原生内嵌编辑器：双向同步、格式化、批量导入。
 */
import { useEffect, useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiCodeSSlashLine,
  RiDownload2Line,
  RiInformationLine,
  RiLoader4Line,
  RiMagicLine,
  RiRefreshLine,
  RiUpload2Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { buildMcpConfigJson, parseMcpServersJson } from "../lib/mcp-json-config"

export function McpJsonEditorView(props: {
  servers: McpServer[]
  onChanged: () => Promise<void>
}) {
  const { servers, onChanged } = props
  const [jsonContent, setJsonContent] = useState("")
  const [copied, setCopied] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)

  useEffect(() => {
    setJsonContent(buildMcpConfigJson(servers))
  }, [servers])

  function flash(type: "success" | "error" | "info", text: string) {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  function handleResetFromLive() {
    setJsonContent(buildMcpConfigJson(servers))
    flash("info", "已重置为当前系统最新配置")
  }

  function handleFormatJson() {
    try {
      const parsed = JSON.parse(jsonContent)
      setJsonContent(JSON.stringify(parsed, null, 2))
      flash("success", "JSON 格式化成功")
    } catch {
      flash("error", "无法格式化：JSON 语法存在错误")
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(jsonContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleExportFile() {
    try {
      const blob = new Blob([jsonContent], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "mcp-servers-config.json"
      a.click()
      URL.revokeObjectURL(url)
      flash("success", "已导出 mcp-servers-config.json")
    } catch {
      flash("error", "导出文件失败")
    }
  }

  async function handleApplyImport() {
    if (!jsonContent.trim() || isApplying) return
    setIsApplying(true)
    setStatusMessage(null)
    try {
      const entries = parseMcpServersJson(jsonContent)
      for (const entry of entries) {
        await getIde().mcp.upsert({
          name: entry.name,
          transport: entry.transport,
          command: entry.command,
          url: entry.url,
          envRef: entry.envRef,
          allowedResourceUris: [],
          modelVisibleTools: [],
          appOnlyTools: [],
          trusted: false
        })
      }
      await onChanged()
      flash("success", `配置应用成功！已解析并同步注册 ${entries.length} 台 MCP Server。`)
    } catch (err: unknown) {
      flash("error", `解析失败: ${err instanceof Error ? err.message : "JSON 格式有误"}`)
    } finally {
      setIsApplying(false)
    }
  }

  const lineCount = jsonContent.split("\n").length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-separator-border/70 bg-background-secondary-default/40 p-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
            <RiCodeSSlashLine className="size-4" />
          </div>
          <div>
            <div className="text-caption-1-medium font-semibold text-text-primary">
              mcpServers 配置编辑器
            </div>
            <div className="text-[11px] text-text-tertiary">
              兼容 Claude Desktop (`claude_desktop_config.json`)、Cursor 与 Cline 规范
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetFromLive}
            className="gap-1 h-7 text-caption-2-medium text-text-secondary"
            title="从当前已安装服务重新生成"
          >
            <RiRefreshLine className="size-3" />
            <span>重新加载</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFormatJson}
            className="gap-1 h-7 text-caption-2-medium text-text-secondary"
            title="美化格式化 JSON"
          >
            <RiMagicLine className="size-3" />
            <span>格式化</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="gap-1 h-7 text-caption-2-medium text-text-secondary"
          >
            {copied ? (
              <RiCheckLine className="size-3 text-emerald-500" />
            ) : (
              <RiClipboardLine className="size-3" />
            )}
            <span>{copied ? "已复制" : "复制"}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportFile}
            className="gap-1 h-7 text-caption-2-medium"
          >
            <RiDownload2Line className="size-3" />
            <span>导出文件</span>
          </Button>
          <Button
            size="sm"
            disabled={isApplying}
            onClick={() => void handleApplyImport()}
            className="gap-1.5 h-7 text-caption-2-medium shadow-xs"
          >
            {isApplying ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiUpload2Line className="size-3" />
            )}
            <span>解析并应用配置</span>
          </Button>
        </div>
      </div>

      {statusMessage ? (
        <div
          className={cx(
            "rounded-lg border px-3 py-2 text-[12px] flex items-center gap-2",
            statusMessage.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : statusMessage.type === "error"
                ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
          )}
        >
          <RiInformationLine className="size-3.5 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      ) : null}

      <div className="relative flex rounded-xl border border-separator-border/80 bg-background-secondary-default/50 overflow-hidden font-mono text-[12.5px] leading-relaxed shadow-xs">
        <div className="select-none border-r border-separator-border/60 bg-background-secondary-default/80 px-2.5 py-3 text-right text-[11px] text-text-tertiary font-mono">
          {Array.from({ length: Math.max(lineCount, 12) }).map((_, i) => (
            <div key={i} className="leading-relaxed">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          value={jsonContent}
          onChange={(e) => setJsonContent(e.target.value)}
          spellCheck={false}
          className="flex-1 resize-none bg-transparent p-3 text-text-primary focus-visible:outline-none min-h-[460px] leading-relaxed"
          placeholder='{\n  "mcpServers": {\n    ...\n  }\n}'
        />
      </div>
    </div>
  )
}
