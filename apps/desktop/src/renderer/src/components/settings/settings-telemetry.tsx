/**
 * Settings → Telemetry & privacy：
 * 本地 APM 监控仪表盘、调用追踪审计、模型路由统计与脱敏上报配置。
 */
import { useState } from "react"
import {
  RiDashboardLine,
  RiFileList3Line,
  RiHardDrive2Line,
  RiLockLine,
  RiPulseLine,
  RiRefreshLine,
  RiRouteLine,
  RiShieldKeyholeLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { ObservabilityDashboardView } from "@renderer/components/observability/components/observability-dashboard-view"
import { ObservabilityModelRouting } from "@renderer/components/observability/components/observability-model-routing"
import { ObservabilityTracesView } from "@renderer/components/observability/components/observability-traces-view"
import { FullTraceWorkbench } from "@renderer/components/observability/components/trace-view/full-trace-workbench"
import { ObservabilityCliUsageView } from "@renderer/components/observability/components/cli-usage/observability-cli-usage-view"
import { useObservabilityPage } from "@renderer/components/observability/use-observability-page"
import { SettingsCard, SettingsRow } from "./settings-row"
import { SettingsHub } from "./settings-hub"
import { usePrefUpdate } from "./settings-pref"
import { useT } from "@renderer/i18n"

type TelemetryTab = "dashboard" | "routing" | "traces" | "cli" | "config"

export function TelemetrySettings() {
  const t = useT()
  const obs = useObservabilityPage()
  const { preferences, update } = usePrefUpdate()
  const [tab, setTab] = useState<TelemetryTab>("dashboard")
  const policy = preferences?.telemetryPolicy ?? "local"

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 指标与隐私看板 ───────────────────────────── */}
      <SettingsHub
        icon={RiPulseLine}
        title={t("settings.telemetry.hubTitle")}
        badge={policy === "otel" ? "OTEL" : policy === "local" ? "Local APM" : "Disabled"}
        description={t("settings.telemetry.hubDesc")}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void obs.refresh()}
            disabled={obs.isRefreshing}
            className="inline-flex items-center gap-1.5 cursor-pointer h-8 text-caption-2-medium shrink-0"
          >
            <RiRefreshLine className={cx("size-3.5", obs.isRefreshing && "animate-spin")} />
            <span>{t("pages.observability.refreshMetrics")}</span>
          </Button>
        }
      />

      {/* ─── 视图选项卡 ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-separator-border/70 pb-3">
        <button
          type="button"
          onClick={() => setTab("dashboard")}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium transition-colors cursor-pointer",
            tab === "dashboard"
              ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold"
              : "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
          )}
        >
          <RiDashboardLine className="size-3.5" />
          <span>{t("pages.observability.viewDashboard")}</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("routing")}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium transition-colors cursor-pointer",
            tab === "routing"
              ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold"
              : "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
          )}
        >
          <RiRouteLine className="size-3.5" />
          <span>{t("pages.observability.navRouting")}</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("traces")}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium transition-colors cursor-pointer",
            tab === "traces"
              ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold"
              : "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
          )}
        >
          <RiFileList3Line className="size-3.5" />
          <span>{t("pages.observability.viewTraces")}</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("cli")}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium transition-colors cursor-pointer",
            tab === "cli"
              ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold"
              : "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
          )}
        >
          <RiHardDrive2Line className="size-3.5" />
          <span>{t("pages.observability.navCliUsage")}</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("config")}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium transition-colors cursor-pointer",
            tab === "config"
              ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold"
              : "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
          )}
        >
          <RiShieldKeyholeLine className="size-3.5" />
          <span>{t("settings.telemetry.exportMode")}</span>
        </button>
      </div>

      {/* ─── 视图主体 ─────────────────────────────────── */}
      {tab === "dashboard" ? (
        <div className="min-h-0 flex-1">
          <ObservabilityDashboardView
            metrics={obs.metrics}
            onInspectMetric={(metric) => {
              obs.setInspectMetric(metric)
              setTab("traces")
            }}
          />
        </div>
      ) : null}

      {tab === "routing" ? (
        <div className="min-h-0 flex-1">
          <ObservabilityModelRouting
            metrics={obs.metrics}
            onSelectModelTrace={(modelId) => {
              obs.handleSelectModelTrace(modelId)
              setTab("traces")
            }}
          />
        </div>
      ) : null}

      {tab === "traces" ? (
        <div className="min-h-0 flex-1">
          {obs.inspectMetric ? (
            <FullTraceWorkbench
              metric={obs.inspectMetric}
              allMetrics={obs.metrics}
              onBack={() => obs.setInspectMetric(null)}
              onSelectMetric={(metric) => obs.setInspectMetric(metric)}
            />
          ) : (
            <ObservabilityTracesView
              metrics={obs.paginatedMetrics}
              filteredTotal={obs.filteredTotal}
              statusFilter={obs.statusFilter}
              kindFilter={obs.kindFilter}
              search={obs.search}
              page={obs.page}
              pageSize={obs.pageSize}
              onStatusFilterChange={obs.onStatusFilterChange}
              onKindFilterChange={obs.onKindFilterChange}
              onSearchChange={obs.onSearchChange}
              onPageChange={obs.setPage}
              onPageSizeChange={(size) => {
                obs.setPageSize(size)
                obs.setPage(1)
              }}
              onInspect={obs.setInspectMetric}
            />
          )}
        </div>
      ) : null}

      {tab === "cli" ? (
        <div className="min-h-0 flex-1">
          <ObservabilityCliUsageView usage={obs.cliUsage} />
        </div>
      ) : null}

      {tab === "config" ? (
        <SettingsCard title={t("settings.telemetry.exportMode")}>
          <SettingsRow title={t("settings.telemetry.storage")} description={t("settings.telemetry.storageDesc")}>
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
                {t("settings.telemetry.localOnly")}
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
                {t("settings.telemetry.otel")}
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
                {t("common.disabled")}
              </button>
            </div>
          </SettingsRow>

          {policy === "otel" && (
            <SettingsRow title={t("settings.telemetry.endpoint")} description={t("settings.telemetry.endpointDesc")}>
              <Input
                value={preferences?.otelEndpoint ?? ""}
                onChange={(e) => void update({ otelEndpoint: e.target.value })}
                placeholder={t("settings.telemetry.endpointPlaceholder")}
                className="h-8 w-64 text-caption-2-regular"
              />
            </SettingsRow>
          )}

          <SettingsRow title={t("settings.telemetry.redaction")} description={t("settings.telemetry.redactionDesc")}>
            <span className="inline-flex items-center gap-1 rounded-full border border-state-success-text/20 bg-state-success-text/10 px-2.5 py-0.5 text-caption-2-medium text-state-success-text dark:text-state-success-text">
              <RiLockLine className="size-3" />
              <span>{t("settings.telemetry.redactionActive")}</span>
            </span>
          </SettingsRow>
        </SettingsCard>
      ) : null}
    </div>
  )
}
