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
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { buildMcpConfigJson, parseMcpServersJson } from "../lib/mcp-json-config"

export function McpJsonEditorView(props: {
  servers: McpServer[]
  onChanged: () => Promise<void>
}) {
  const { servers, onChanged } = props
  const t = useT()
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
    flash("info", t("pages.mcp.resetToLive"))
  }

  function handleFormatJson() {
    try {
      const parsed = JSON.parse(jsonContent)
      setJsonContent(JSON.stringify(parsed, null, 2))
      flash("success", t("pages.mcp.formatOk"))
    } catch {
      flash("error", t("pages.mcp.formatFail"))
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
      flash("success", t("pages.mcp.exportedFile"))
    } catch {
      flash("error", t("pages.mcp.exportFail"))
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
      flash("success", t("pages.mcp.applyOk", { n: entries.length }))
    } catch (err: unknown) {
      flash("error", t("pages.mcp.parseFail", { message: err instanceof Error ? err.message : t("pages.mcp.jsonInvalid") }))
    } finally {
      setIsApplying(false)
    }
  }

  const lineCount = jsonContent.split("\n").length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-separator-border/70 bg-background-secondary-default/40 p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
            <RiCodeSSlashLine className="size-4" />
          </div>
          <div>
            <div className="text-caption-1-medium font-semibold text-text-primary">
              {t("pages.mcp.jsonEditorTitle")}
            </div>
            <div className="text-[11px] text-text-tertiary">
              {t("pages.mcp.jsonEditorHint")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetFromLive}
            className="gap-1 h-7 text-caption-2-medium text-text-secondary"
            title={t("pages.mcp.reloadFromInstalled")}
          >
            <RiRefreshLine className="size-3" />
            <span>{t("pages.mcp.reload")}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFormatJson}
            className="gap-1 h-7 text-caption-2-medium text-text-secondary"
            title={t("pages.mcp.formatJsonTitle")}
          >
            <RiMagicLine className="size-3" />
            <span>{t("pages.mcp.format")}</span>
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
            <span>{copied ? t("common.copied") : t("common.copy")}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportFile}
            className="gap-1 h-7 text-caption-2-medium"
          >
            <RiDownload2Line className="size-3" />
            <span>{t("pages.mcp.exportFile")}</span>
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
            <span>{t("pages.mcp.applyConfig")}</span>
          </Button>
        </div>
      </div>

      {statusMessage ? (
        <div
          className={cx(
            "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-caption-2-medium",
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

      <div className="relative flex min-h-0 flex-1 overflow-y-auto rounded-xl border border-separator-border/80 bg-background-secondary-default/50 font-mono text-caption-1-regular leading-relaxed shadow-xs">
        <div className="shrink-0 select-none border-r border-separator-border/60 bg-background-secondary-default/80 px-2.5 py-3 text-right font-mono text-caption-2-medium text-text-tertiary">
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
          rows={Math.max(lineCount, 12)}
          className="min-h-full flex-1 resize-none overflow-hidden bg-transparent p-3 leading-relaxed text-text-primary focus-visible:outline-none"
          placeholder='{\n  "mcpServers": {\n    ...\n  }\n}'
        />
      </div>
    </div>
  )
}
