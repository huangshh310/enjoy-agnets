/**
 * Studio Zone 3：Customize 与 Observability。
 */
import { RiArrowRightLine, RiEqualizer3Line, RiPulseLine } from "@remixicon/react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"

export function StudioConfigInsightsZone({
  metrics,
  latestMetric,
  onOpenCustomize,
  onOpenObservability
}: {
  metrics: TelemetryMetric[]
  latestMetric?: TelemetryMetric
  onOpenCustomize: () => void
  onOpenObservability: () => void
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
            <RiPulseLine className="size-3.5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">
            Config & Insights · 全局定制与运行洞察
          </h3>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">Prompt customization & execution telemetry trace</span>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <article
          onClick={onOpenCustomize}
          className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs transition-colors group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500">
                <RiEqualizer3Line className="size-5" />
              </div>
              <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                Rules & Persona
              </span>
            </div>
            <h4 className="mt-3.5 text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
              Agent Customization
            </h4>
            <p className="mt-0.5 text-caption-1-medium text-text-secondary">
              System prompt directives, rules file references, and subagent persona behavior.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
            <span className="text-caption-2-medium text-text-tertiary">Customize prompt rules</span>
            <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 group-hover:underline dark:text-accent-400">
              <span>Customize agent</span>
              <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </article>

        <article
          onClick={onOpenObservability}
          className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs transition-colors group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500">
                <RiPulseLine className="size-5" />
              </div>
              <span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[11px] font-semibold text-accent-600 dark:text-accent-400">
                {metrics.length} logged
              </span>
            </div>
            <h4 className="mt-3.5 text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
              Observability & Telemetry
            </h4>
            <p className="mt-0.5 text-caption-1-medium text-text-secondary">
              Redacted execution traces, token throughput, TTFO latency & JSON export.
            </p>
            {latestMetric ? (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-background-secondary-default p-2.5 text-[11px]">
                <span className="font-mono text-text-secondary">Latest: {latestMetric.durationMs ?? 0}ms</span>
                {latestMetric.ttfoMs ? (
                  <span className="font-medium text-accent-600 dark:text-accent-400">TTFO: {latestMetric.ttfoMs}ms</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
            <span className="text-caption-2-medium text-text-tertiary">OTEL disabled by default</span>
            <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 group-hover:underline dark:text-accent-400">
              <span>View metrics & trace</span>
              <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </article>
      </div>
    </section>
  )
}
