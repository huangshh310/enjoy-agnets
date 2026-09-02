/**
 * 可观测性数据导出与 OTEL 远程上报策略栏组件
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiDownload2Line,
  RiGlobalLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { ObservabilityOtelModal } from "./observability-otel-modal"

export function ObservabilityPolicyBar(props?: { onPolicyChanged?: () => void }) {
  const t = useT()
  const [exported, setExported] = useState("")
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | null>(null)
  const [copied, setCopied] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [otelModalOpen, setOtelModalOpen] = useState(false)

  async function handleExport(format: "json" | "csv") {
    setIsExporting(true)
    setExportFormat(format)
    try {
      const result = (await getIde().observability.export(format)) as { body: string }
      setExported(result.body)
    } finally {
      setIsExporting(false)
    }
  }

  function handleCopyExport() {
    if (!exported) return
    void navigator.clipboard.writeText(exported)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[11.5px] text-text-secondary">
          <RiShieldCheckLine className="size-4 text-emerald-500 shrink-0" />
          <span>{t("pages.observability.policyNotice")}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOtelModalOpen(true)}
            className="gap-1.5 h-7 text-caption-2-medium"
            title={t("pages.observability.otelTitle")}
          >
            <RiGlobalLine className="size-3" />
            <span>{t("pages.observability.otelButton")}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isExporting}
            onClick={() => void handleExport("json")}
            className="gap-1.5 h-7 text-caption-2-medium"
          >
            <RiDownload2Line className="size-3" />
            <span>{t("pages.observability.exportJson")}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isExporting}
            onClick={() => void handleExport("csv")}
            className="gap-1.5 h-7 text-caption-2-medium"
          >
            <RiDownload2Line className="size-3" />
            <span>{t("pages.observability.exportCsv")}</span>
          </Button>
        </div>
      </div>

      {/* 导出内容展示区 */}
      {exported ? (
        <div className="mt-1 rounded-lg border border-separator-border/70 bg-background-primary-default p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono uppercase text-text-tertiary">
              {t("pages.observability.exportPayload", {
                format: exportFormat ?? "json",
                n: exported.length
              })}
            </span>
            <button
              type="button"
              onClick={handleCopyExport}
              className="inline-flex items-center gap-1 text-[11px] text-accent-600 dark:text-accent-400 hover:underline"
            >
              {copied ? (
                <>
                  <RiCheckLine className="size-3 text-emerald-500" />
                  <span>{t("common.copied")}</span>
                </>
              ) : (
                <>
                  <RiClipboardLine className="size-3" />
                  <span>{t("pages.observability.copyContent")}</span>
                </>
              )}
            </button>
          </div>
          <pre className="font-mono text-[10.5px] text-text-secondary max-h-36 overflow-auto leading-relaxed whitespace-pre-wrap">
            {exported}
          </pre>
        </div>
      ) : null}

      <ObservabilityOtelModal
        open={otelModalOpen}
        onOpenChange={setOtelModalOpen}
        onSaved={() => {
          props?.onPolicyChanged?.()
        }}
      />
    </div>
  )
}
