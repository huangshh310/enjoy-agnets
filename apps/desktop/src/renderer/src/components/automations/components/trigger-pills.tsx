/**
 * P0 触发：手动 · cron。保存后 / webhook 划掉，不假装已做。
 */
import { cx } from "@/utils/cx"
import type { AutomationTrigger } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function TriggerPills({
  value,
  onChange
}: {
  value: AutomationTrigger
  onChange: (value: AutomationTrigger) => void
}) {
  const t = useT()
  return (
    <div>
      <p className="text-caption-1-medium text-text-tertiary">{t("studio.automations.trigger")}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <TriggerChip
          selected={value === "manual"}
          onClick={() => onChange("manual")}
          label={t("studio.automations.manual")}
        />
        <TriggerChip
          selected={value === "cron"}
          onClick={() => onChange("cron")}
          label={t("studio.automations.cron")}
        />
        <span className="rounded-full bg-background-secondary-default/70 px-2.5 py-1 text-caption-1-medium text-text-tertiary/50 ring-1 ring-border-button-default line-through">
          {t("studio.automations.onSave")}
        </span>
        <span className="rounded-full bg-background-secondary-default/70 px-2.5 py-1 text-caption-1-medium text-text-tertiary/50 ring-1 ring-border-button-default line-through">
          {t("studio.automations.webhook")}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-text-tertiary">{t("studio.automations.triggerHint")}</p>
    </div>
  )
}

function TriggerChip({
  selected,
  onClick,
  label
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-full px-2.5 py-1 text-caption-1-medium",
        selected
          ? "bg-accent-500 font-semibold text-text-white"
          : "bg-background-secondary-default text-text-tertiary ring-1 ring-border-button-default"
      )}
    >
      {label}
    </button>
  )
}
