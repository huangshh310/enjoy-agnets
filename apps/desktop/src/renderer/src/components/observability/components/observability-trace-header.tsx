/**
 * Trace 抽屉顶栏：状态、回到对话、复制 JSON、标签切换。
 */
import {
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiCodeSSlashLine,
  RiDashboardLine,
  RiKey2Line,
  RiPulseLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import type { TraceModalTab } from "./observability-trace.types"

export function ObservabilityTraceHeader({
  metric,
  timeFormatted,
  copied,
  copiedRunId,
  activeTab,
  onTab,
  onCopyJson,
  onCopyRunId,
  onBackToChat,
  onClose
}: {
  metric: TelemetryMetric
  timeFormatted: string
  copied: boolean
  copiedRunId: boolean
  activeTab: TraceModalTab
  onTab: (tab: TraceModalTab) => void
  onCopyJson: () => void
  onCopyRunId: () => void
  onBackToChat: () => void
  onClose: () => void
}) {
  const t = useT()
  const isSuccess =
    metric.status === "success" || metric.status === "completed" || metric.status === "ok"
  const isRunning = metric.status === "running"
  return (
    <div className="flex flex-col gap-3 border-b border-separator-border/70 bg-background-secondary-default/20 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <StatusMark success={isSuccess} running={isRunning} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-body-medium font-bold tracking-tight text-text-primary">
                {t("pages.observability.executionTrace", { kind: metric.kind.toUpperCase() })}
              </DialogTitle>
              <span className="flex items-center gap-1.5 rounded bg-background-secondary-default px-2 py-0.5 font-mono text-caption-2-medium uppercase text-text-secondary">
                <ModelBrandIcon modelId={metric.modelId} size={13} className="shrink-0" />
                {metric.modelId ?? t("pages.observability.default")}
              </span>
              <span
                className={cx(
                  "rounded px-2 py-0.5 font-mono text-caption-2-medium uppercase",
                  isSuccess
                    ? "bg-state-success-text/10 text-state-success-text"
                    : isRunning
                      ? "bg-accent-500/10 text-accent-500"
                      : "bg-background-tertiary-error/10 text-text-error-primary"
                )}
              >
                {metric.status}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 font-mono text-caption-2-regular text-text-tertiary">
              <span className="max-w-[340px] truncate">{t("pages.observability.runId", { id: metric.runId })}</span>
              <button
                type="button"
                onClick={onCopyRunId}
                className="text-caption-2-medium text-accent-500 hover:text-text-primary"
              >
                {copiedRunId ? t("common.copied") : t("pages.observability.copyId")}
              </button>
              <span>·</span>
              <span>{timeFormatted}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onBackToChat}
            className="mr-1 inline-flex cursor-pointer items-center gap-1 text-caption-2-medium text-accent-500 hover:underline"
          >
            {t("pages.observability.backToChat")}
          </button>
          <Button size="sm" variant="outline" onClick={onCopyJson} className="h-7 gap-1 text-caption-2-medium">
            {copied ? <RiCheckLine className="size-3 text-state-success-text" /> : <RiClipboardLine className="size-3" />}
            <span>{copied ? t("pages.observability.copiedJson") : t("pages.observability.copyJson")}</span>
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            className="size-7 text-text-tertiary hover:text-text-primary"
            title={t("common.close")}
          >
            <RiCloseLine className="size-4" />
          </Button>
        </div>
      </div>
      <TraceTabs activeTab={activeTab} onTab={onTab} />
    </div>
  )
}

function StatusMark({ success, running }: { success: boolean; running: boolean }) {
  return (
    <div
      className={cx(
        "flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs",
        success
          ? "border-state-success-text/20 bg-state-success-text/10 text-state-success-text"
          : running
            ? "border-accent-500/20 bg-accent-500/10 text-accent-500"
            : "border-border-error-default/20 bg-background-tertiary-error/10 text-text-error-primary"
      )}
    >
      {success ? <RiCheckLine className="size-4" /> : running ? <RiPulseLine className="size-4 animate-pulse" /> : <RiCloseLine className="size-4" />}
    </div>
  )
}

function TraceTabs({
  activeTab,
  onTab
}: {
  activeTab: TraceModalTab
  onTab: (tab: TraceModalTab) => void
}) {
  const t = useT()
  const tabs: Array<{ id: TraceModalTab; icon: typeof RiDashboardLine; label: string }> = [
    { id: "overview", icon: RiDashboardLine, label: t("pages.observability.tabOverview") },
    { id: "attributes", icon: RiKey2Line, label: t("pages.observability.tabAttributes") },
    { id: "json", icon: RiCodeSSlashLine, label: t("pages.observability.tabRaw") }
  ]
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap border-t border-separator-border/40 pt-1.5">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTab(tab.id)}
            className={cx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-caption-2-medium transition-all",
              active
                ? "bg-background-primary-default font-semibold text-text-primary shadow-2xs"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Icon className="size-3.5" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
