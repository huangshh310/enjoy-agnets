/**
 * 监控大盘：KPI、策略条、时序与分布图。
 */
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { ObservabilityHistogramChart } from "./observability-charts-histogram"
import { ObservabilityKindChart } from "./observability-charts-kind"
import { ObservabilityModelsChart } from "./observability-charts-models"
import { ObservabilityStatusChart } from "./observability-charts-status"
import { ObservabilityThroughputChart } from "./observability-charts-throughput"
import { ObservabilityTimelineChart } from "./observability-charts-timeline"
import { ObservabilityKpiBar } from "./observability-kpi-bar"
import { ObservabilityPolicyBar } from "./observability-policy-bar"

export function ObservabilityDashboardView({ metrics }: { metrics: TelemetryMetric[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
      <ObservabilityKpiBar metrics={metrics} />
      <ObservabilityPolicyBar />
      <div className="grid gap-3.5 lg:grid-cols-2">
        <ObservabilityTimelineChart metrics={metrics} />
        <ObservabilityThroughputChart metrics={metrics} />
      </div>
      <div className="grid gap-3.5 md:grid-cols-2 2xl:grid-cols-4">
        <ObservabilityModelsChart metrics={metrics} />
        <ObservabilityKindChart metrics={metrics} />
        <ObservabilityHistogramChart metrics={metrics} />
        <ObservabilityStatusChart metrics={metrics} />
      </div>
    </div>
  )
}
