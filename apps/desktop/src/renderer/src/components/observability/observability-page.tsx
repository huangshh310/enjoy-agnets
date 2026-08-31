/**
 * 本地指标与导出。外部 OTEL 默认关闭。
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RiPulseLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"
import { ObservabilityReplay } from "./observability-replay"

export function ObservabilityPage() {
  const [exported, setExported] = useState("")
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
        label: "Metrics",
        items: [{ id: "all", label: "Local runs", icon: RiPulseLine, meta: String(metrics.length) }]
      }
    ],
    [metrics.length]
  )

  return (
    <SecondaryPageShell groups={groups} selectedId="all" onSelect={() => undefined} contentWidth="wide">
      <div className="flex flex-col gap-6">
        <div>
          <h1 data-testid="page-observability" className="text-title-3-semibold text-text-primary">
            Observability
          </h1>
          <p className="mt-1 text-body-medium text-text-secondary">
            Prompts, keys, and tool args are redacted. Local runs record duration, TTFO, and tokens/s.
            OTEL stays off until you opt in.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void getIde()
                .observability.export("json")
                .then((result) => setExported((result as { body: string }).body))
            }
          >
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void getIde()
                .observability.export("csv")
                .then((result) => setExported((result as { body: string }).body))
            }
          >
            Export CSV
          </Button>
        </div>
        <ul className="divide-y divide-separator-border rounded-2xl border border-border-button-default">
          {metrics.map((metric) => (
            <li key={metric.id} className="px-4 py-3">
              <p className="text-body-medium text-text-primary">
                {metric.kind} · {metric.status}
              </p>
              <p className="text-caption-1-medium text-text-tertiary">
                {metric.modelId ?? "—"} · {metric.durationMs ?? 0}ms · TTFO{" "}
                {metric.ttfoMs ?? "—"}ms · {metric.errorClass ?? "ok"}
              </p>
            </li>
          ))}
          {metrics.length === 0 ? (
            <li className="px-4 py-6 text-body-medium text-text-secondary">No metrics yet.</li>
          ) : null}
        </ul>
        <ObservabilityReplay />
        {exported ? (
          <pre className="max-h-64 overflow-auto rounded-2xl bg-background-secondary-default p-4 text-caption-1-medium text-text-secondary">
            {exported}
          </pre>
        ) : null}
      </div>
    </SecondaryPageShell>
  )
}
