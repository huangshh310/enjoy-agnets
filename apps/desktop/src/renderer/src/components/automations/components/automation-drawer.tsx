/**
 * 约 380px 右侧抽屉：名称、触发、cron、引擎、模型、探索/执行、提示词。
 */
import { useEffect, useState } from "react"
import { cx } from "@/utils/cx"
import { automationSaveReason, automationSaveReasonTone } from "../lib/save-reason"
import { footerHint } from "../lib/footer-hint"
import { RiCloseLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AgentToolPublic, AutomationMissedRecord } from "@enjoy-agents/ipc-contract"
import { handleDrawerClosePointer } from "@renderer/components/settings/settings-drawer-close"
import { SettingsSideDrawer } from "@renderer/components/settings/settings-side-drawer"
import { useT } from "@renderer/i18n"
import { APP_REGION_NO_DRAG_STYLE } from "@renderer/lib/app-region"
import { AUTOMATION_DRAWER_WIDTH_CLASS } from "../constants"
import type { AutomationDraft } from "../lib/draft"
import { webhookPortReady } from "../lib/trigger-chips"
import { CatchUpToggle } from "./catch-up-toggle"
import { EnginePills } from "./engine-pills"
import { MissedRecordsList } from "./missed-records-list"
import { ModePills } from "./mode-pills"
import { AutomationProjectField } from "./project-field"
import { ScheduleFields } from "./schedule-fields"
import { TriggerPills } from "./trigger-pills"
import { WebhookFields } from "./webhook-fields"

export function AutomationDrawer({
  open,
  draft,
  tools,
  saving,
  running,
  records,
  lastRunText,
  locale,
  now,
  onClose,
  onChange,
  onSave,
  onRun,
  onRemove
}: {
  open: boolean
  draft: AutomationDraft | null
  tools: AgentToolPublic[]
  saving: boolean
  running: boolean
  records: AutomationMissedRecord[]
  lastRunText?: string
  locale: string
  now: number
  onClose: () => void
  onChange: (patch: Partial<AutomationDraft>) => void
  onSave: () => void
  onRun: () => void
  onRemove: () => void
}) {
  const t = useT()
  // 抽屉刚打开、用户还没动过：原因用中性灰；动过之后才红（luna：一打开就红像报错）。
  const [touched, setTouched] = useState(false)
  const draftKey = draft?.id ?? "new"
  useEffect(() => {
    if (open) setTouched(false)
  }, [open, draftKey])
  if (!draft) return null
  const change = (patch: Partial<AutomationDraft>) => {
    setTouched(true)
    onChange(patch)
  }
  const canSave = Boolean(draft.name.trim() && draft.prompt.trim())
  const cronReady = !draft.triggers.includes("cron") || Boolean(draft.cronExpr.trim())
  const webhookReady = !draft.triggers.includes("webhook") || webhookPortReady(draft.webhookPort)
  // 含「手动」就能立即运行；提示只跟着真实触发方式走，手动时不出「到点才跑」（luna 3cf0）。
  const runNow = draft.triggers.includes("manual")
  const hint = runNow ? null : footerHint(draft.triggers, t)

  const saveDisabled = !canSave || !cronReady || !webhookReady || saving
  // 说明空着保存不了：要说原因（luna #151）；名字也空时一起说。
  const saveReason = automationSaveReason(draft, t)
  // 编辑态把说明清空后，「立即运行」会跑旧说明，所以一起禁用（luna #151）。
  const runDisabled = !draft.id || running || !draft.name.trim() || !draft.prompt.trim()
  return (
    <SettingsSideDrawer
      open={open}
      onClose={onClose}
      labelledBy="automation-editor-title"
      closeLabel={t("common.close")}
      widthClass={AUTOMATION_DRAWER_WIDTH_CLASS}
    >
      <header className="flex items-start justify-between gap-2 border-b border-separator-border px-4 py-3">
        <div>
          <p id="automation-editor-title" className="text-body-medium font-semibold text-text-primary">
            {draft.id ? t("studio.automations.editTitle") : t("studio.automations.createTitle")}
          </p>
          <p className="mt-0.5 text-caption-2-regular text-text-secondary">{t("studio.automations.workspaceHint")}</p>
        </div>
        <button
          type="button"
          onPointerDown={(event) => handleDrawerClosePointer(event, onClose)}
          onClick={onClose}
          data-testid="automation-drawer-close"
          data-app-region="no-drag"
          style={APP_REGION_NO_DRAG_STYLE}
          className="inline-flex size-8 items-center justify-center rounded-lg text-caption-1-medium text-text-tertiary [app-region:no-drag]"
          aria-label={t("common.close")}
        >
          <RiCloseLine className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <label className="block">
          <span className="text-caption-1-medium text-text-primary">{t("studio.automations.nameLabel")}</span>
          <Input
            value={draft.name}
            onChange={(event) => change({ name: event.target.value })}
            placeholder={t("studio.automations.namePlaceholder")}
            className="mt-1"
          />
        </label>
        <AutomationProjectField />
        <TriggerPills
          value={draft.triggers}
          onChange={(triggers) => change({ triggers, trigger: triggers[0] ?? draft.trigger })}
        />
        {draft.triggers.includes("cron") ? (
          <ScheduleFields
            cronExpr={draft.cronExpr}
            timeZone={draft.timeZone}
            onChange={change}
          />
        ) : null}
        {draft.triggers.includes("on_save") ? (
          <p className="rounded-lg bg-background-secondary-default px-2.5 py-2 text-caption-2-regular text-text-secondary">
            {t("studio.automations.onSaveHint")}
          </p>
        ) : null}
        {draft.triggers.includes("webhook") ? <WebhookFields draft={draft} onChange={change} /> : null}
        <EnginePills tools={tools} value={draft.runtimeId} onChange={(runtimeId) => change({ runtimeId })} />
        <label className="mt-2 block">
          <span className="flex items-baseline gap-1.5 text-caption-1-medium text-text-secondary">
            <span>{t("studio.automations.modelLabel")}</span>
            <span className="text-caption-2-regular text-text-tertiary">
              {t("studio.automations.modelOptional")}
            </span>
          </span>
          <Input
            value={draft.modelId}
            onChange={(event) => change({ modelId: event.target.value })}
            placeholder={t("studio.automations.modelPlaceholder")}
            className="mt-1"
          />
        </label>
        <ModePills mode={draft.mode} onChange={(mode) => change({ mode })} />
        {draft.triggers.includes("cron") ? (
          <CatchUpToggle
            checked={draft.catchUpMissed}
            onChange={(catchUpMissed) => change({ catchUpMissed })}
          />
        ) : null}
        {draft.id ? (
          <MissedRecordsList records={records} lastRunText={lastRunText} locale={locale} now={now} />
        ) : null}
        <label className="block">
          <span className="text-caption-1-medium text-text-secondary">{t("studio.automations.promptLabel")}</span>
          <Textarea
            value={draft.prompt}
            onChange={(event) => change({ prompt: event.target.value })}
            placeholder={t("studio.automations.promptPlaceholder")}
            className="mt-1 h-20 resize-none"
          />
        </label>
      </div>
      <footer className="flex flex-nowrap items-center justify-end gap-2 border-t border-separator-border px-4 py-3">
        {saveReason ? (
          <span
            data-testid="automation-save-reason"
            role="status"
            title={saveReason}
            data-tone={automationSaveReasonTone(touched)}
            className={cx(
              "mr-auto min-w-0 truncate text-caption-2-regular",
              automationSaveReasonTone(touched) === "error" ? "text-text-error-primary" : "text-text-secondary"
            )}
          >
            {saveReason}
          </span>
        ) : null}
        {runNow ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="automation-run-now"
            disabled={runDisabled}
            title={runDisabled && saveReason ? saveReason : undefined}
            className="disabled:border-border-button-default disabled:bg-transparent disabled:text-text-tertiary disabled:opacity-50"
            onClick={onRun}
          >
            {running ? t("studio.automations.running") : t("studio.automations.runNow")}
          </Button>
        ) : hint && !saveReason ? (
          <span data-testid="automation-footer-hint" title={hint} className="mr-auto min-w-0 truncate text-caption-2-regular text-text-secondary">
            {hint}
          </span>
        ) : null}
        {draft.id ? (
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
            {t("common.delete")}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="solid"
          data-testid="automation-save"
          disabled={saveDisabled}
          title={saveReason ?? undefined}
          className="disabled:opacity-50"
          onClick={() => {
            setTouched(true)
            onSave()
          }}
        >
          {t("studio.automations.save")}
        </Button>
      </footer>
    </SettingsSideDrawer>
  )
}
