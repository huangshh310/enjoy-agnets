/**
 * 心跳表单字段：cron、时区、prompt、次数。
 */
import type { ReactNode } from "react"
import type { TranslateFn } from "@renderer/i18n"
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
      <Field label={t("chat.heartbeatCron")} id="session-heartbeat-cron">
        <input
          id="session-heartbeat-cron"
          value={draft.cronExpr}
          placeholder={t("chat.heartbeatCadence")}
          onChange={(event) => onChange({ cronExpr: event.target.value })}
          className={fieldClass}
        />
      </Field>
      <Field label={t("chat.heartbeatTimeZone")} id="session-heartbeat-tz">
        <input
          id="session-heartbeat-tz"
          value={draft.timeZone}
          placeholder={t("chat.heartbeatTimeZone")}
          onChange={(event) => onChange({ timeZone: event.target.value })}
          className={fieldClass}
        />
      </Field>
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
