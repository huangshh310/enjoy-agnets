/**
 * Settings → 遥测与隐私：默认面只留收集说明与记录开关。
 * 指标大盘（Local APM / TTFO / P95）只在开发者文案档出现。
 */
import { RiShieldKeyholeLine } from "@remixicon/react"
import { Switch } from "@/components/ui/switch"
import { isDevCopyEnabled } from "@renderer/lib/dev-copy"
import { useObservabilityPage } from "@renderer/components/observability/use-observability-page"
import { SettingsCard, SettingsRow } from "./settings-row"
import { SettingsHub } from "./settings-hub"
import { usePrefUpdate } from "./settings-pref"
import { TelemetryDevPanel } from "./settings-telemetry-dev"
import { telemetryFaceKeys } from "./settings-telemetry-copy"
import { useT } from "@renderer/i18n"

export function TelemetrySettings() {
  const t = useT()
  const obs = useObservabilityPage()
  const { preferences, update } = usePrefUpdate()
  const policy = preferences?.telemetryPolicy ?? "local"
  const recording = policy !== "off"
  const avgTtfo = formatAvgTtfoSeconds(obs.metrics)
  const face = telemetryFaceKeys(policy)
  const collectDesc = t(`settings.telemetry.${face.collect}`)

  return (
    <div data-testid="page-telemetry" className="flex flex-col gap-6">
      <SettingsHub icon={RiShieldKeyholeLine} title={t("nav.telemetry")} description={collectDesc} />

      <SettingsCard title={t("settings.telemetry.collectTitle")}>
        <SettingsRow title={t("settings.telemetry.collectTitle")} description={collectDesc}>
          {avgTtfo != null ? (
            <span className="text-caption-1-medium text-text-secondary">
              {t("settings.telemetry.avgTtfo", { n: avgTtfo })}
            </span>
          ) : null}
        </SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow
          title={t("settings.telemetry.recordLocal")}
          description={t(`settings.telemetry.${face.recordDesc}`)}
        >
          <Switch
            checked={recording}
            aria-label={t("settings.telemetry.recordLocal")}
            onCheckedChange={(on) => {
              void update({ telemetryPolicy: on ? (policy === "otel" ? "otel" : "local") : "off" })
            }}
          />
        </SettingsRow>
      </SettingsCard>

      {/* TODO(kai): 跟进 PR 补 observability.clear 后再放「清除本地记录」。现在没有接口，不画假按钮。 */}

      {isDevCopyEnabled() ? <TelemetryDevPanel /> : null}
    </div>
  )
}

/** 默认面若要出数字，只走人话「平均首字时间 N 秒」。 */
export function formatAvgTtfoSeconds(metrics: Array<{ ttfoMs?: number }>): string | null {
  const values = metrics
    .map((row) => row.ttfoMs)
    .filter((ms): ms is number => typeof ms === "number" && Number.isFinite(ms) && ms > 0)
  if (values.length === 0) return null
  const seconds = values.reduce((sum, ms) => sum + ms, 0) / values.length / 1000
  return (Math.round(seconds * 10) / 10).toFixed(1)
}
