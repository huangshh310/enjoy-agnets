/**
 * Settings → 遥测与隐私：默认面只留收集说明、改进开关、清除记录。
 * 指标大盘（Local APM / TTFO / P95）只在开发者文案档出现。
 */
import { useState } from "react"
import { RiShieldKeyholeLine } from "@remixicon/react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { isDevCopyEnabled } from "@renderer/lib/dev-copy"
import { useObservabilityPage } from "@renderer/components/observability/use-observability-page"
import { SettingsCard, SettingsRow } from "./settings-row"
import { SettingsHub } from "./settings-hub"
import { usePrefUpdate } from "./settings-pref"
import { TelemetryDevPanel } from "./settings-telemetry-dev"
import { useT } from "@renderer/i18n"

export function TelemetrySettings() {
  const t = useT()
  const obs = useObservabilityPage()
  const { preferences, update } = usePrefUpdate()
  const [confirmClear, setConfirmClear] = useState(false)
  const policy = preferences?.telemetryPolicy ?? "local"
  const recording = policy !== "off"
  const avgTtfo = formatAvgTtfoSeconds(obs.metrics)
  const collectDesc =
    policy === "otel" ? t("settings.telemetry.collectDescOtel") : t("settings.telemetry.collectDesc")

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
          title={t("settings.telemetry.helpImprove")}
          description={t("settings.telemetry.helpImproveDesc")}
        >
          <Switch
            checked={recording}
            aria-label={t("settings.telemetry.helpImprove")}
            onCheckedChange={(on) => {
              void update({ telemetryPolicy: on ? (policy === "otel" ? "otel" : "local") : "off" })
            }}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow
          title={t("settings.telemetry.clearLocal")}
          description={t("settings.telemetry.clearLocalDesc")}
        >
          <Button
            size="sm"
            variant="outline"
            className="h-8 cursor-pointer text-caption-2-medium"
            onClick={() => setConfirmClear(true)}
          >
            {t("settings.telemetry.clearLocal")}
          </Button>
        </SettingsRow>
      </SettingsCard>

      {isDevCopyEnabled() ? <TelemetryDevPanel /> : null}

      <ConfirmDialog
        open={confirmClear}
        title={t("settings.telemetry.clearConfirmTitle")}
        description={t("settings.telemetry.clearConfirmDesc")}
        onOpenChange={setConfirmClear}
        onConfirm={() => {
          // 无现成 observability.clear IPC，不假装已删除。
        }}
      />
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
