/**
 * 紧凑 C 端行：名称 · 触发 · 次行（上次 / 已跳过 / 错过 N 次）· 开/停。
 */
import type { Automation, AutomationMissedRecord } from "@enjoy-agents/ipc-contract"
import { Switch } from "@/components/ui/switch"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { lastRunLine } from "../lib/last-run-line"
import { automationRowStatus } from "../lib/row-status"
import { listTriggerChips } from "../lib/trigger-chips"

export function AutomationRow({
  automation,
  records,
  locale,
  now,
  engineLabel,
  onOpen,
  onToggle,
  onOpenFailed
}: {
  automation: Automation
  records: AutomationMissedRecord[]
  locale: string
  now: number
  engineLabel: string
  onOpen: () => void
  onToggle: (enabled: boolean) => void
  onOpenFailed: () => void
}) {
  const t = useT()
  const status = automationRowStatus(automation)
  const chips = listTriggerChips(automation)
  const line = lastRunLine({ automation, records, now, locale, t })

  return (
    <li
      className={cx(
        "border-b border-separator-border last:border-b-0",
        !automation.enabled && "opacity-70"
      )}
      data-testid="automation-row"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-body-medium text-text-primary">{automation.name}</p>
            {chips.map((chip) => (
              <span
                key={`${chip.kind}:${chip.text}`}
                className={cx(
                  "rounded-full bg-background-secondary-default px-1.5 py-px text-caption-2-regular text-text-primary ring-1 ring-border-button-default",
                  chip.mono && "font-mono"
                )}
              >
                {chipLabel(chip.kind, chip.text, t)}
              </span>
            ))}
            <StatusChip status={status} t={t} />
          </div>
          <p
            className="mt-0.5 text-caption-1-medium text-text-tertiary"
            title={line.tip}
            data-testid={line.testId}
          >
            {line.text}
          </p>
        </button>
        <Switch
          checked={automation.enabled}
          onCheckedChange={onToggle}
          aria-label={automation.enabled ? t("studio.automations.disableAria") : t("studio.automations.enableAria")}
        />
      </div>
      {status === "running" ? (
        <p className="border-t border-accent-500/15 bg-accent-500/10 px-4 py-1.5 text-caption-1-medium text-accent-600">
          {t("studio.automations.runningBar", { engine: engineLabel, mode: modeLabel(automation, t) })}
        </p>
      ) : null}
      {status === "failed" ? (
        <button
          type="button"
          onClick={onOpenFailed}
          className="w-full border-t border-border-error-default/15 bg-background-secondary-default px-4 py-1.5 text-left text-caption-1-medium text-text-error-primary"
        >
          {t("studio.automations.failedBar")}
        </button>
      ) : null}
    </li>
  )
}

function StatusChip({
  status,
  t
}: {
  status: "idle" | "running" | "failed"
  t: (key: string) => string
}) {
  if (status === "idle") {
    return (
      <span className="rounded-full bg-background-secondary-default px-1.5 py-px text-caption-2-regular text-text-tertiary ring-1 ring-border-button-default">
        {t("studio.automations.statusIdle")}
      </span>
    )
  }
  if (status === "running") {
    return (
      <span className="rounded-full bg-accent-500/10 px-1.5 py-px text-caption-2-medium font-medium text-accent-600 ring-1 ring-accent-500/20">
        {t("studio.automations.statusRunning")}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-background-secondary-default px-1.5 py-px text-caption-2-medium font-medium text-text-error-primary ring-1 ring-border-error-default/25">
      {t("studio.automations.statusFailed")}
    </span>
  )
}

function chipLabel(kind: string, text: string, t: (key: string) => string): string {
  if (kind === "cron" || kind === "webhook") return text
  if (kind === "on_save") return t("studio.automations.onSave")
  return t("studio.automations.manual")
}

function modeLabel(item: Automation, t: (key: string) => string): string {
  return item.mode === "plan" || item.mode === "ask"
    ? t("chat.surfaceExplore")
    : t("chat.surfaceExecute")
}
