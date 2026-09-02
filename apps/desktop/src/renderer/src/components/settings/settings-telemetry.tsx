/**
 * Settings → Telemetry & privacy：本地指标监控与脱敏隐私配置。
 * 支持 Local 私有监控、OpenTelemetry (OTEL) 遥测上报与代码/密钥自动脱敏保障。
 */
import { useNavigate } from "@tanstack/react-router"
import {
  RiArrowRightLine,
  RiLockLine,
  RiPulseLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"

export function TelemetrySettings() {
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()
  const policy = preferences?.telemetryPolicy ?? "local"

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 指标与隐私概览看板 ───────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <RiPulseLine className="size-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-body-large-semibold text-text-primary">
                  Local-first Telemetry & Observability
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                  Zero External Leaks
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary mt-0.5">
                Tracks token throughput, latency (TTFO), success rates, and tool traces with strict local redaction.
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/observability" })}
            className="inline-flex items-center gap-1.5 cursor-pointer h-8 text-caption-2-medium shrink-0"
          >
            <RiPulseLine className="size-3.5 text-sky-500" />
            <span>Open Observability</span>
            <RiArrowRightLine className="size-3.5 opacity-60 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* ─── 遥测模式与隐私策略 ───────────────────────────── */}
      <SettingsCard title="Telemetry & Export Mode">
        <SettingsRow
          title="Metrics storage policy"
          description="Local keeps data strictly in SQLite. OTEL exports OTLP JSON to your collector."
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void update({ telemetryPolicy: "local" })}
              className={cx(
                "rounded-lg px-2.5 py-1 text-caption-2-medium transition-colors cursor-pointer border",
                policy === "local"
                  ? "bg-accent-500/10 border-accent-500/30 text-accent-600 dark:text-accent-400 font-semibold shadow-2xs"
                  : "border-border-button-default bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover"
              )}
            >
              Local Only (Private)
            </button>
            <button
              type="button"
              onClick={() => void update({ telemetryPolicy: "otel" })}
              className={cx(
                "rounded-lg px-2.5 py-1 text-caption-2-medium transition-colors cursor-pointer border",
                policy === "otel"
                  ? "bg-accent-500/10 border-accent-500/30 text-accent-600 dark:text-accent-400 font-semibold shadow-2xs"
                  : "border-border-button-default bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover"
              )}
            >
              OpenTelemetry (OTEL)
            </button>
            <button
              type="button"
              onClick={() => void update({ telemetryPolicy: "off" })}
              className={cx(
                "rounded-lg px-2.5 py-1 text-caption-2-medium transition-colors cursor-pointer border",
                policy === "off"
                  ? "bg-accent-500/10 border-accent-500/30 text-accent-600 dark:text-accent-400 font-semibold shadow-2xs"
                  : "border-border-button-default bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover"
              )}
            >
              Disabled
            </button>
          </div>
        </SettingsRow>

        {policy === "otel" && (
          <SettingsRow
            title="OTLP endpoint"
            description="HTTP/HTTPS collector URL (e.g. Langfuse, Helicone, or OpenTelemetry Collector)."
          >
            <Input
              value={preferences?.otelEndpoint ?? ""}
              onChange={(e) => void update({ otelEndpoint: e.target.value })}
              placeholder="https://collector:4318/v1/traces"
              className="h-8 w-64 text-caption-2-regular"
            />
          </SettingsRow>
        )}

        <SettingsRow
          title="Automatic redaction"
          description="Prompts, API keys, and workspace paths are scrubbed from telemetry logs and exports."
        >
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-caption-2-medium text-emerald-600 dark:text-emerald-400">
            <RiLockLine className="size-3" />
            <span>Redaction Active</span>
          </span>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
