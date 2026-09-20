/**
 * 紧凑 C 端行：名称 · 触发 · 上次 · 开/停；运行中 / 失败条。
 */
import { Switch } from "@/components/ui/switch"
import { cx } from "@/utils/cx"
import type { Automation } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { formatLastRunWhen } from "../lib/last-run-label"
import { automationRowStatus } from "../lib/row-status"

export function AutomationRow({
  automation,
  locale,
  now,
  engineLabel,
  onOpen,
  onToggle,
  onOpenFailed
}: {
  automation: Automation
  locale: string
  now: number
  engineLabel: string
  onOpen: () => void
  onToggle: (enabled: boolean) => void
  onOpenFailed: () => void
}) {
  const t = useT()
  const status = automationRowStatus(automation)
  const trigger = triggerLabel(automation, t)

  return (
    <li
      className={cx(
        "border-b border-separator-border last:border-b-0",
        !automation.enabled && "opacity-70"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-body-medium text-text-primary">{automation.name}</p>
            <span
              className={cx(
                "rounded-full bg-background-secondary-default px-1.5 py-px text-[10px] text-text-primary ring-1 ring-border-button-default",
                automation.trigger === "cron" && "font-mono"
              )}
            >
              {trigger}
            </span>
            <StatusChip status={status} t={t} />
          </div>
          <p className="mt-0.5 text-caption-1-medium text-text-tertiary">
            {status === "running"
              ? t("studio.automations.roundOpened")
              : automation.lastRunAt
                ? t("studio.automations.lastRun", {
                    when: formatLastRunWhen(automation.lastRunAt, now, locale)
                  })
                : t("studio.automations.neverRun")}
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
      <span className="rounded-full bg-background-secondary-default px-1.5 py-px text-[10px] text-text-tertiary ring-1 ring-border-button-default">
        {t("studio.automations.statusIdle")}
      </span>
    )
  }
  if (status === "running") {
    return (
      <span className="rounded-full bg-accent-500/10 px-1.5 py-px text-[10px] font-medium text-accent-600 ring-1 ring-accent-500/20">
        {t("studio.automations.statusRunning")}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-background-secondary-default px-1.5 py-px text-[10px] font-medium text-text-error-primary ring-1 ring-border-error-default/25">
      {t("studio.automations.statusFailed")}
    </span>
  )
}

function triggerLabel(item: Automation, t: (key: string) => string): string {
  if (item.trigger === "cron") return item.cronExpr?.trim() || t("studio.automations.cron")
  if (item.trigger === "on_save") return t("studio.automations.onSave")
  return t("studio.automations.manual")
}

function modeLabel(item: Automation, t: (key: string) => string): string {
  return item.mode === "plan" || item.mode === "ask"
    ? t("chat.surfaceExplore")
    : t("chat.surfaceExecute")
}
