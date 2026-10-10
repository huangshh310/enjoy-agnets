/**
 * 紧凑 C 端行：名称 · 触发 · 次行（上次 / 已跳过 / 错过 N 次）· 开/停。
 */
import type { Automation, AutomationMissedRecord } from "@enjoy-agents/ipc-contract"
import { Switch } from "@/components/ui/switch"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { cronChipLabel } from "../lib/cron-chip-label"
import { lastRunLine } from "../lib/last-run-line"
import { automationRowStatus } from "../lib/row-status"
import { listTriggerChips } from "../lib/trigger-chips"
import { isDevCopyEnabled } from "@renderer/lib/dev-copy"
import { LastRunExplain } from "./last-run-explain"

export function AutomationRow({
  automation,
  records,
  locale,
  now,
  onOpen,
  onToggle,
  onOpenFailed
}: {
  automation: Automation
  records: AutomationMissedRecord[]
  locale: string
  now: number
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
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} className="w-full text-left">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-body-medium text-text-primary">{automation.name}</p>
              {chips.map((chip) => {
                const shown = chipLabel(chip.kind, chip.text, t)
                return (
                  <span
                    key={`${chip.kind}:${chip.text}`}
                    title={shown.title}
                    className="rounded-full bg-background-secondary-default px-1.5 py-px text-caption-2-regular text-text-primary ring-1 ring-border-button-default"
                  >
                    {shown.label}
                  </span>
                )
              })}
              <StatusChip status={status} t={t} />
            </div>
          </button>
          <LastRunExplain text={line.text} tip={line.tip} testId={line.testId} />
        </div>
        <Switch
          checked={automation.enabled}
          onCheckedChange={onToggle}
          aria-label={automation.enabled ? t("studio.automations.disableAria") : t("studio.automations.enableAria")}
        />
      </div>
      {status === "running" ? (
        <p className="border-t border-accent-500/15 bg-accent-500/10 px-4 py-1.5 text-caption-1-medium text-accent-600">
          {t("studio.automations.runningBar")}
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
  if (status === "idle") return null
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

function chipLabel(
  kind: string,
  text: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): { label: string; title?: string } {
  if (kind === "cron") {
    const plain = cronChipLabel(text, t)
    const showRaw = plain.custom || isDevCopyEnabled()
    return { label: plain.label, title: showRaw ? plain.raw : undefined }
  }
  if (kind === "webhook") return { label: t("studio.automations.webhookPortChip", { port: text }) }
  if (kind === "on_save") return { label: t("studio.automations.onSave") }
  return { label: t("studio.automations.manual") }
}

