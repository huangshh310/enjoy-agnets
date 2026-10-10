/**
 * 遥测开发者档：指标大盘 / 路由 / 链路 / 本机记录 / OTEL。
 * 默认面不渲染；打开 localStorage enjoy-agents-dev-copy=1。
 */
import { useState } from "react"
import {
  RiDashboardLine,
  RiFileList3Line,
  RiHardDrive2Line,
  RiLockLine,
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
import { usePrefUpdate } from "./settings-pref"
import { useT } from "@renderer/i18n"

type TelemetryTab = "dashboard" | "routing" | "traces" | "cli" | "config"

export function TelemetryDevPanel() {
  const t = useT()
  const obs = useObservabilityPage()
  const { preferences, update } = usePrefUpdate()
  const [tab, setTab] = useState<TelemetryTab>("dashboard")
  const policy = preferences?.telemetryPolicy ?? "local"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption-1-medium text-text-secondary">{t("settings.telemetry.devPanel")}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void obs.refresh()}
          disabled={obs.isRefreshing}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 text-caption-2-medium"
        >
          <RiRefreshLine className={cx("size-3.5", obs.isRefreshing && "animate-spin")} />
          <span>{t("pages.observability.refreshMetrics")}</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-separator-border/70 pb-3">
        <DevTabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={RiDashboardLine}>
          {t("pages.observability.viewDashboard")}
        </DevTabButton>
        <DevTabButton active={tab === "routing"} onClick={() => setTab("routing")} icon={RiRouteLine}>
          {t("pages.observability.navRouting")}
        </DevTabButton>
        <DevTabButton active={tab === "traces"} onClick={() => setTab("traces")} icon={RiFileList3Line}>
          {t("pages.observability.viewTraces")}
        </DevTabButton>
        <DevTabButton active={tab === "cli"} onClick={() => setTab("cli")} icon={RiHardDrive2Line}>
          {t("pages.observability.navCliUsage")}
        </DevTabButton>
        <DevTabButton active={tab === "config"} onClick={() => setTab("config")} icon={RiShieldKeyholeLine}>
          {t("settings.telemetry.exportMode")}
        </DevTabButton>
      </div>

      {tab === "dashboard" ? (
        <ObservabilityDashboardView
          metrics={obs.metrics}
          onInspectMetric={(metric) => {
            obs.setInspectMetric(metric)
            setTab("traces")
          }}
        />
      ) : null}

      {tab === "routing" ? (
        <ObservabilityModelRouting
          metrics={obs.metrics}
          onSelectModelTrace={(modelId) => {
            obs.handleSelectModelTrace(modelId)
            setTab("traces")
          }}
        />
      ) : null}

      {tab === "traces" ? (
        obs.inspectMetric ? (
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
        )
      ) : null}

      {tab === "cli" ? <ObservabilityCliUsageView usage={obs.cliUsage} /> : null}

      {tab === "config" ? (
        <SettingsCard title={t("settings.telemetry.exportMode")}>
          <SettingsRow title={t("settings.telemetry.storage")} description={t("settings.telemetry.storageDesc")}>
            <div className="flex items-center gap-1.5">
              {(["local", "otel", "off"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void update({ telemetryPolicy: item })}
                  className={cx(
                    "cursor-pointer rounded-lg border px-2.5 py-1 text-caption-2-medium transition-colors",
                    policy === item
                      ? "border-accent-500/30 bg-accent-500/10 font-semibold text-accent-600 shadow-2xs dark:text-accent-400"
                      : "border-border-button-default bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover"
                  )}
                >
                  {item === "local"
                    ? t("settings.telemetry.localOnly")
                    : item === "otel"
                      ? t("settings.telemetry.otel")
                      : t("common.disabled")}
                </button>
              ))}
            </div>
          </SettingsRow>
          {policy === "otel" ? (
            <SettingsRow title={t("settings.telemetry.endpoint")} description={t("settings.telemetry.endpointDesc")}>
              <Input
                value={preferences?.otelEndpoint ?? ""}
                onChange={(event) => void update({ otelEndpoint: event.target.value })}
                placeholder={t("settings.telemetry.endpointPlaceholder")}
                className="h-8 w-64 text-caption-2-regular"
              />
            </SettingsRow>
          ) : null}
          <SettingsRow title={t("settings.telemetry.redaction")} description={t("settings.telemetry.redactionDesc")}>
            <span className="inline-flex items-center gap-1 rounded-full border border-state-success-text/20 bg-state-success-text/10 px-2.5 py-0.5 text-caption-2-medium text-state-success-text">
              <RiLockLine className="size-3" />
              <span>{t("settings.telemetry.redactionActive")}</span>
            </span>
          </SettingsRow>
        </SettingsCard>
      ) : null}
    </div>
  )
}

function DevTabButton({
  active,
  onClick,
  icon: Icon,
  children
}: {
  active: boolean
  onClick: () => void
  icon: typeof RiDashboardLine
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium transition-colors",
        active
          ? "bg-accent-500/10 font-semibold text-accent-600 dark:text-accent-400"
          : "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
      )}
    >
      <Icon className="size-3.5" />
      <span>{children}</span>
    </button>
  )
}
