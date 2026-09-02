/**
 * Settings → Sandbox：执行超时、循环步数上限与网络安全沙箱。
 * 对齐 Vercel AI SDK 7 的 stopWhen / prepareStep 步数与超时约束体系。
 */
import { RiTerminalBoxLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cx } from "@/utils/cx"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"
import { useT } from "@renderer/i18n"

export function SandboxSettings() {
  const t = useT()
  const { preferences, update } = usePrefUpdate()

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 沙箱执行概览 ───────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <RiTerminalBoxLine className="size-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-body-large-semibold text-text-primary">
                {t("settings.sandbox.hubTitle")}
              </span>
              <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                {t("settings.sandbox.hubBadge")}
              </span>
            </div>
            <span className="text-caption-2-regular text-text-tertiary mt-0.5">
              {t("settings.sandbox.hubDesc")}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 核心循环与超时约束 ─────────────────────────── */}
      <SettingsCard title={t("settings.sandbox.limits")}>
        <SettingsRow title={t("settings.sandbox.maxSteps")} description={t("settings.sandbox.maxStepsDesc")}>
          <div className="flex items-center gap-2">
            <TimeoutInput
              value={preferences?.maxAgentSteps ?? 20}
              min={1}
              max={64}
              widthClass="w-20"
              onCommit={(next) => void update({ maxAgentSteps: next })}
            />
            <span className="text-caption-2-medium text-text-tertiary">{t("settings.sandbox.steps")}</span>
          </div>
        </SettingsRow>

        <SettingsRow title={t("settings.sandbox.toolTimeout")} description={t("settings.sandbox.toolTimeoutDesc")}>
          <div className="flex items-center gap-2">
            <TimeoutInput
              testId="tool-timeout-ms"
              value={preferences?.toolTimeoutMs ?? 30_000}
              min={1_000}
              max={300_000}
              widthClass="w-24"
              onCommit={(next) => void update({ toolTimeoutMs: next })}
            />
            <span className="text-caption-2-medium text-text-tertiary">
              {t("settings.sandbox.msSeconds", {
                seconds: ((preferences?.toolTimeoutMs ?? 30_000) / 1000).toFixed(0)
              })}
            </span>
          </div>
        </SettingsRow>

        <SettingsRow title={t("settings.sandbox.stepTimeout")} description={t("settings.sandbox.stepTimeoutDesc")}>
          <div className="flex items-center gap-2">
            <TimeoutInput
              testId="step-timeout-ms"
              value={preferences?.stepTimeoutMs ?? 0}
              min={0}
              max={600_000}
              widthClass="w-24"
              onCommit={(next) => void update({ stepTimeoutMs: next })}
            />
            <span className="text-caption-2-medium text-text-tertiary">{t("settings.sandbox.ms")}</span>
          </div>
        </SettingsRow>

        <SettingsRow title={t("settings.sandbox.runTimeout")} description={t("settings.sandbox.runTimeoutDesc")}>
          <div className="flex items-center gap-2">
            <TimeoutInput
              testId="agent-timeout-ms"
              value={preferences?.agentTimeoutMs ?? 0}
              min={0}
              max={600_000}
              widthClass="w-24"
              onCommit={(next) => void update({ agentTimeoutMs: next })}
            />
            <span className="text-caption-2-medium text-text-tertiary">{t("settings.sandbox.ms")}</span>
          </div>
        </SettingsRow>

        <SettingsRow title={t("settings.sandbox.network")} description={t("settings.sandbox.networkDesc")}>
          <Switch
            checked={preferences?.sandboxNetwork ?? false}
            onCheckedChange={(value) => void update({ sandboxNetwork: value })}
          />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

function TimeoutInput({
  value,
  min,
  max,
  onCommit,
  testId,
  widthClass = "w-28"
}: {
  value: number
  min: number
  max: number
  onCommit: (next: number) => void
  testId?: string
  widthClass?: string
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      className={cx("h-8 text-caption-2-medium", widthClass)}
      data-testid={testId}
      value={value}
      onChange={(event) => {
        const next = parseInt(event.target.value, 10)
        if (!Number.isNaN(next)) {
          onCommit(Math.max(min, Math.min(max, next)))
        }
      }}
    />
  )
}
