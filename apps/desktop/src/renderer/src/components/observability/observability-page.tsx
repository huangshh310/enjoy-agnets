/**
 * 本地指标与导出。外部 OTEL 默认关闭。
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiDownload2Line,
  RiLoader4Line,
  RiPulseLine,
  RiShieldCheckLine,
  RiSpeedUpLine,
  RiTimeLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"
import { ObservabilityReplay } from "./observability-replay"

export function ObservabilityPage() {
  const [exported, setExported] = useState("")
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | null>(null)
  const [copied, setCopied] = useState(false)

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    enabled: hasIde(),
    queryFn: () => getIde().observability.metrics({ limit: 100 }) as Promise<TelemetryMetric[]>
  })
  const metrics = metricsQuery.data ?? []

  const groups = useMemo(
    () => [
      {
        id: "metrics",
        label: "Telemetry & Logs",
        items: [
          {
            id: "all",
            label: "Local executions",
            icon: RiPulseLine,
            meta: String(metrics.length)
          }
        ]
      }
    ],
    [metrics.length]
  )

  async function handleExport(format: "json" | "csv") {
    setExportFormat(format)
    const result = (await getIde().observability.export(format)) as { body: string }
    setExported(result.body)
  }

  function handleCopyExport() {
    if (!exported) return
    void navigator.clipboard.writeText(exported)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <SecondaryPageShell
      searchPlaceholder="Filter metrics..."
      groups={groups}
      selectedId="all"
      onSelect={() => undefined}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-7">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 shadow-xs">
              <RiPulseLine className="size-5" />
            </div>
            <h1 data-testid="page-observability" className="text-title-3-semibold text-text-primary">
              Observability & Telemetry
            </h1>
          </div>
          <p className="text-body-medium text-text-secondary">
            Prompts, keys, and tool arguments are automatically redacted. Local runs record duration,
            time-to-first-output (TTFO), and throughput. OTEL stays strictly disabled unless opted in.
          </p>
        </header>

        {/* Export and Policy Info Card */}
        <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
            <div className="flex items-center gap-2">
              <RiShieldCheckLine className="size-4 text-emerald-500" />
              <h3 className="text-body-medium font-semibold text-text-primary">
                Local Telemetry Policy
              </h3>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Redacted & Local Only
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-caption-1-medium text-text-secondary max-w-xl">
                Export execution logs for debugging and local latency auditing. Keys and prompts are
                never included in the export payload.
              </p>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shadow-xs"
                  onClick={() => void handleExport("json")}
                >
                  <RiDownload2Line className="size-3.5" />
                  <span>Export JSON</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shadow-xs"
                  onClick={() => void handleExport("csv")}
                >
                  <RiDownload2Line className="size-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {exported ? (
              <div className="mt-3 relative rounded-xl border border-separator-border/60 bg-background-secondary-default p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-semibold uppercase text-text-tertiary">
                    {exportFormat} Export Payload:
                  </span>
                  <button
                    type="button"
                    title="Copy payload"
                    onClick={handleCopyExport}
                    className="inline-flex items-center gap-1 rounded-md border border-border-button-default bg-background-primary-default px-2 py-0.5 text-[11px] text-text-secondary hover:text-text-primary shadow-xs transition-colors"
                  >
                    {copied ? (
                      <>
                        <RiCheckLine className="size-3 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <RiClipboardLine className="size-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="max-h-56 overflow-auto font-mono text-[11px] leading-relaxed text-text-secondary">
                  {exported}
                </pre>
              </div>
            ) : null}
          </div>
        </section>

        {/* Execution Metrics Bento List */}
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-body-medium font-semibold text-text-primary">
              Recent Executions ({metrics.length})
            </h3>
          </div>

          {metrics.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 px-6 py-8 text-center">
              <RiPulseLine className="size-8 text-text-tertiary" />
              <p className="mt-2 text-body-medium font-semibold text-text-primary">
                No telemetry metrics logged yet
              </p>
              <p className="mt-1 max-w-sm text-caption-1-medium text-text-secondary">
                Run agent tasks, structured completions, or tool actions to populate latency and token logs.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {metrics.map((metric) => (
                <article
                  key={metric.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default shadow-xs text-text-secondary">
                        <RiSpeedUpLine className="size-4.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-body-medium font-semibold text-text-primary uppercase">
                            {metric.kind}
                          </span>
                          <MetricStatusBadge status={metric.status} />
                          {metric.errorClass && metric.errorClass !== "ok" ? (
                            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-600 dark:text-rose-400">
                              {metric.errorClass}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex items-center gap-3 text-caption-2-medium text-text-tertiary flex-wrap">
                          <span className="font-mono font-medium text-text-secondary">
                            {metric.modelId ?? "default"}
                          </span>
                          <span>·</span>
                          <span>{metric.durationMs ?? 0}ms total</span>
                          {metric.ttfoMs ? (
                            <>
                              <span>·</span>
                              <span className="text-accent-600 dark:text-accent-400 font-medium">
                                TTFO: {metric.ttfoMs}ms
                              </span>
                            </>
                          ) : null}
                          {metric.tokensPerSecond ? (
                            <>
                              <span>·</span>
                              <span>{metric.tokensPerSecond.toFixed(1)} tok/s</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-[11px] text-text-tertiary shrink-0">
                      ID: {metric.id.slice(0, 12)}...
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Live Replay Inspector */}
        <ObservabilityReplay />
      </div>
    </SecondaryPageShell>
  )
}

function MetricStatusBadge({ status }: { status: string }) {
  if (status === "success" || status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <RiCheckLine className="size-3" />
        Success
      </span>
    )
  }

  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[11px] font-semibold text-accent-600 dark:text-accent-400">
        <RiLoader4Line className="size-3 animate-spin" />
        Running
      </span>
    )
  }

  if (status === "error" || status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
        <RiCloseLine className="size-3" />
        Failed
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background-tertiary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary capitalize">
      <RiTimeLine className="size-3" />
      {status}
    </span>
  )
}

