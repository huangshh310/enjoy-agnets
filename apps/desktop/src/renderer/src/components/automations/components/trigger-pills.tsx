/**
 * I4-P1 触发：手动 · cron · 保存后 · webhook，可多选并存。
 */
import { cx } from "@/utils/cx"
import type { AutomationTrigger } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { toggleTrigger } from "../lib/trigger-chips"

const TRIGGERS: { id: AutomationTrigger; labelKey: string }[] = [
  { id: "manual", labelKey: "studio.automations.manual" },
  { id: "cron", labelKey: "studio.automations.cron" },
  { id: "on_save", labelKey: "studio.automations.onSave" },
  { id: "webhook", labelKey: "studio.automations.webhook" }
]

export function TriggerPills({
  value,
  onChange
}: {
  value: AutomationTrigger[]
  onChange: (value: AutomationTrigger[]) => void
}) {
  const t = useT()
  return (
    <div>
      <p className="text-caption-1-medium text-text-tertiary">{t("studio.automations.trigger")}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {TRIGGERS.map((item) => (
          <TriggerChip
            key={item.id}
            selected={value.includes(item.id)}
            onClick={() => onChange(toggleTrigger(value, item.id))}
            label={t(item.labelKey)}
          />
        ))}
      </div>
      <p className="mt-1 text-caption-2-regular text-text-tertiary">{t("studio.automations.triggerHint")}</p>
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
