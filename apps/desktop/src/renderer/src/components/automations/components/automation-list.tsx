/**
 * 已配置自动化卡片：开关、编辑、删除、复制 prompt。
 */
import {
  RiCheckLine,
  RiClipboardLine,
  RiCursorLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFlashlightLine,
  RiPlayCircleLine,
  RiRobot2Line,
  RiSaveLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cx } from "@/utils/cx"
import type { Automation, AutomationTrigger } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function AutomationList({
  automations,
  totalCount,
  draftOpen,
  copiedId,
  onToggle,
  onEdit,
  onRemove,
  onCopyPrompt,
  onRun,
  runningId
}: {
  automations: Automation[]
  totalCount: number
  draftOpen: boolean
  copiedId: string | null
  onToggle: (automation: Automation, enabled: boolean) => void
  onEdit: (automation: Automation) => void
  onRemove: (id: string) => void
  onCopyPrompt: (id: string, text: string) => void
  onRun: (automation: Automation) => void
  runningId: string | null
}) {
  const t = useT()

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-body-medium font-semibold text-text-primary">
          {t("studio.automations.configured", { count: automations.length })}
        </h3>
      </div>
      {automations.length === 0 && !draftOpen ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/40 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs">
            <RiRobot2Line className="size-6" />
          </div>
          <h4 className="mt-3 text-body-medium font-semibold text-text-primary">
            {totalCount === 0 ? t("studio.automations.emptyTitle") : t("studio.automations.noMatchTitle")}
          </h4>
          <p className="mt-1 max-w-md text-caption-1-medium text-text-secondary">
            {totalCount === 0
              ? t("studio.automations.emptyHint", { action: t("studio.automations.newAutomation") })
              : t("studio.automations.noMatchHint")}
          </p>
        </div>
      ) : null}
      {automations.length > 0 ? (
        <div className="grid gap-3.5">
          {automations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              copiedId={copiedId}
              onToggle={onToggle}
              onEdit={onEdit}
              onRemove={onRemove}
              onCopyPrompt={onCopyPrompt}
              onRun={onRun}
              running={runningId === automation.id}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function AutomationCard({
  automation,
  copiedId,
  onToggle,
  onEdit,
  onRemove,
  onCopyPrompt,
  onRun,
  running
}: {
  automation: Automation
  copiedId: string | null
  onToggle: (automation: Automation, enabled: boolean) => void
  onEdit: (automation: Automation) => void
  onRemove: (id: string) => void
  onCopyPrompt: (id: string, text: string) => void
  onRun: (automation: Automation) => void
  running: boolean
}) {
  const t = useT()

  return (
    <article
      className={cx(
        "group relative flex flex-col justify-between rounded-2xl border p-4.5 shadow-xs transition-all",
        automation.enabled
          ? "border-border-button-default bg-background-primary-default hover:border-accent-500/40 hover:shadow-md"
          : "border-border-button-default/60 bg-background-secondary-default/40 opacity-75"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cx(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-xs",
              automation.trigger === "on_save"
                ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-accent-500/20 bg-accent-500/10 text-accent-600 dark:text-accent-400"
            )}
          >
            {automation.trigger === "on_save" ? (
              <RiSaveLine className="size-4.5" />
            ) : (
              <RiPlayCircleLine className="size-4.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-body-medium font-semibold text-text-primary">{automation.name}</h4>
              <TriggerBadge trigger={automation.trigger} />
              {!automation.enabled ? (
                <span className="rounded-md bg-background-tertiary-default px-1.5 py-0.5 text-[11px] font-medium text-text-tertiary">
                  {t("common.disabled")}
                </span>
              ) : null}
            </div>
            <span className="font-mono text-[11px] text-text-tertiary">
              {t("studio.automations.idPrefix", { id: automation.id.slice(0, 12) })}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="mr-2 flex items-center gap-1.5">
            <span className="text-caption-2-medium text-text-secondary">
              {automation.enabled ? t("studio.automations.active") : t("common.off")}
            </span>
            <Switch
              checked={automation.enabled}
              onCheckedChange={(checked) => onToggle(automation, checked)}
              aria-label={automation.enabled ? t("studio.automations.disableAria") : t("studio.automations.enableAria")}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!automation.enabled || running}
            onClick={() => onRun(automation)}
            className="h-7 px-2 text-caption-2-medium"
          >
            {running ? t("studio.automations.running") : t("studio.automations.runNow")}
          </Button>
          <Button size="icon-sm" variant="ghost" title={t("studio.automations.editAria")} onClick={() => onEdit(automation)}>
            <RiEditLine className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            title={t("studio.automations.deleteAria")}
            className="text-text-tertiary hover:text-rose-500"
            onClick={() => onRemove(automation.id)}
          >
            <RiDeleteBinLine className="size-4" />
          </Button>
        </div>
      </div>
      <div className="relative mt-3 rounded-xl border border-separator-border/70 bg-background-secondary-default p-3">
        <p className="line-clamp-3 font-mono text-caption-1-medium leading-relaxed text-text-secondary">
          {automation.prompt || t("studio.automations.noPrompt")}
        </p>
        {automation.prompt ? (
          <button
            type="button"
            title={t("studio.automations.copyPrompt")}
            onClick={() => onCopyPrompt(automation.id, automation.prompt)}
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-border-button-default bg-background-primary-default px-2 py-1 text-[11px] text-text-secondary shadow-xs transition-colors hover:text-text-primary"
          >
            {copiedId === automation.id ? (
              <>
                <RiCheckLine className="size-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">{t("common.copied")}</span>
              </>
            ) : (
              <>
                <RiClipboardLine className="size-3" />
                <span>{t("common.copy")}</span>
              </>
            )}
          </button>
        ) : null}
      </div>
    </article>
  )
}

function TriggerBadge({ trigger }: { trigger: AutomationTrigger }) {
  const t = useT()
  if (trigger === "on_save") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <RiFlashlightLine className="size-3" />
        {t("studio.automations.onSave")}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[11px] font-medium text-accent-600 dark:text-accent-400">
      <RiCursorLine className="size-3" />
      {t("studio.automations.manual")}
    </span>
  )
}
