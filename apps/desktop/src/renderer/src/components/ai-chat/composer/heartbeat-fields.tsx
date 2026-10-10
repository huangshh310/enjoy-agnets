/**
 * 心跳表单：定时走人话预设（与自动化抽屉同一套），再写要说的话和次数。
 */
import type { ReactNode } from "react"
import type { TranslateFn } from "@renderer/i18n"
import { ScheduleFields } from "@renderer/components/automations/components/schedule-fields"
import type { HeartbeatDraft } from "./heartbeat-draft"

export function HeartbeatFields({
  draft,
  t,
  onChange
}: {
  draft: HeartbeatDraft
  t: TranslateFn
  onChange: (patch: Partial<HeartbeatDraft>) => void
}) {
  return (
    <>
      <div className="mt-2" data-testid="session-heartbeat-schedule">
        <ScheduleFields
          cronExpr={draft.cronExpr}
          timeZone={draft.timeZone}
          onChange={onChange}
        />
      </div>
      <Field label={t("chat.heartbeatPrompt")} id="session-heartbeat-prompt">
        <textarea
          id="session-heartbeat-prompt"
          value={draft.prompt}
          rows={3}
          onChange={(event) => onChange({ prompt: event.target.value })}
          className="mt-1 w-full resize-none rounded-md border border-border-button-default bg-transparent px-2 py-1.5 text-caption-1-regular text-text-primary"
        />
      </Field>
      <Field label={t("chat.heartbeatMaxRuns")} id="session-heartbeat-max">
        <input
          id="session-heartbeat-max"
          inputMode="numeric"
          value={draft.maxRuns}
          onChange={(event) => onChange({ maxRuns: event.target.value })}
          className={fieldClass}
        />
      </Field>
    </>
  )
}

const fieldClass =
  "mt-1 h-8 w-full rounded-md border border-border-button-default bg-transparent px-2 text-caption-1-regular text-text-primary"

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <label className="mt-2 block text-caption-2-medium text-text-secondary" htmlFor={id}>
      {label}
      {children}
    </label>
  )
}
