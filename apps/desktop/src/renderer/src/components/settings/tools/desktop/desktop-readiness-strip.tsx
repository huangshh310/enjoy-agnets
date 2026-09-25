/**
 * 开通三拍：开关 → 系统权限 → 执行器。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { DesktopReadiness, DesktopStepState } from "./desktop-readiness"

export function DesktopReadinessStrip({ readiness }: { readiness: DesktopReadiness }) {
  const t = useT()
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      <StepCard
        state={readiness.switchState}
        label={t("settings.builtinTools.stepSwitch")}
        value={readiness.switchOn ? t("settings.builtinTools.stepSwitchOn") : t("settings.builtinTools.stepSwitchOff")}
      />
      <StepCard
        state={readiness.permsState}
        label={t("settings.builtinTools.stepPerms")}
        value={readiness.permsOk ? t("settings.builtinTools.stepPermsOk") : t("settings.builtinTools.stepPermsNeed")}
      />
      <StepCard
        state={readiness.helperState}
        label={t("settings.builtinTools.stepHelper")}
        value={readiness.helperOk ? t("settings.builtinTools.stepHelperOk") : t("settings.builtinTools.stepHelperNeed")}
      />
    </ol>
  )
}

function StepCard({ state, label, value }: { state: DesktopStepState; label: string; value: string }) {
  return (
    <li
      className={cx(
        "rounded-xl border px-3 py-2",
        state === "ok" && "border-state-success-text/25 bg-state-success-base/40",
        state === "warn" && "border-text-warning-primary/30 bg-text-warning-primary/5",
        state === "off" && "border-border-button-default bg-background-secondary-default"
      )}
    >
      <p
        className={cx(
          "text-caption-2-semibold uppercase tracking-wide",
          state === "ok" && "text-state-success-text",
          state === "warn" && "text-text-warning-primary",
          state === "off" && "text-text-tertiary"
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 text-caption-1-medium text-text-primary">{value}</p>
    </li>
  )
}
