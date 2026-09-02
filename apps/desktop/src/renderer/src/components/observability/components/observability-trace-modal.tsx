/**
 * Trace 诊断抽屉：组合顶栏与概览 / 属性 / JSON。
 */
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useNavigate } from "@tanstack/react-router"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getTraceOtelRows } from "./observability-trace-copy"
import { ObservabilityTraceHeader } from "./observability-trace-header"
import { ObservabilityTraceOverview } from "./observability-trace-overview"
import { ObservabilityTraceAttributes, ObservabilityTraceJson } from "./observability-trace-panels"
import type { TraceModalTab } from "./observability-trace.types"

export function ObservabilityTraceModal(props: {
  metric: TelemetryMetric | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { metric, open, onOpenChange } = props
  const t = useT()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TraceModalTab>("overview")
  const [copied, setCopied] = useState(false)
  const [copiedRunId, setCopiedRunId] = useState(false)
  if (!metric) return null

  const duration = metric.durationMs ?? 0
  const ttfo = metric.ttfoMs ?? 0
  const inTok = metric.inputTokens ?? 0
  const outTok = metric.outputTokens ?? 0
  const timeFormatted = new Date(metric.createdAt).toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
  const rawJson = JSON.stringify(metric, null, 2)
  const otelAttributes = getTraceOtelRows(metric, t, {
    duration,
    ttfo,
    inTok,
    outTok,
    totalTokens: inTok + outTok,
    timeFormatted
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[94vw] gap-0 overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default p-0 shadow-2xl sm:max-w-4xl lg:sm:max-w-5xl"
      >
        <ObservabilityTraceHeader
          metric={metric}
          timeFormatted={timeFormatted}
          copied={copied}
          copiedRunId={copiedRunId}
          activeTab={activeTab}
          onTab={setActiveTab}
          onCopyJson={() => {
            void navigator.clipboard.writeText(rawJson).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
          onCopyRunId={() => {
            void navigator.clipboard.writeText(metric.runId || metric.id || "").then(() => {
              setCopiedRunId(true)
              setTimeout(() => setCopiedRunId(false), 2000)
            })
          }}
          onBackToChat={() => {
            onOpenChange(false)
            void navigate({ to: "/" })
          }}
          onClose={() => onOpenChange(false)}
        />
        <div className="flex max-h-[75vh] flex-col gap-4.5 overflow-y-auto p-6">
          {activeTab === "overview" ? <ObservabilityTraceOverview metric={metric} /> : null}
          {activeTab === "attributes" ? <ObservabilityTraceAttributes rows={otelAttributes} /> : null}
          {activeTab === "json" ? <ObservabilityTraceJson rawJson={rawJson} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
