/**
 * 溢出菜单里的会话心跳。到点只对当前会话发一句，不新建会话。
 */
import { useEffect, useState } from "react"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { draftFromHeartbeat, emptyHeartbeatDraft, type HeartbeatDraft } from "./heartbeat-draft"
import { HeartbeatFields } from "./heartbeat-fields"
import { saveHeartbeat, stopHeartbeat } from "./heartbeat-save"

export function SessionHeartbeatForm() {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const [draft, setDraft] = useState<HeartbeatDraft>(emptyHeartbeatDraft)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  useHeartbeatDraft(sessionId, setDraft)

  if (!sessionId) return null

  return (
    <form
      className="mt-2 border-t border-separator-border/60 px-1 pt-2"
      onSubmit={(event) => {
        event.preventDefault()
        void submit(sessionId, draft, t, setDraft, setError, setSaving)
      }}
    >
      <p className="text-caption-1-semibold text-text-primary">{t("chat.heartbeatTitle")}</p>
      <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t("chat.heartbeatHint")}</p>
      {draft.paused ? <p className="mt-1 text-caption-2-regular text-text-secondary">{t("chat.heartbeatPaused")}</p> : null}
      <HeartbeatFields draft={draft} t={t} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
      {error ? <p className="mt-1 text-caption-2-regular text-text-error-primary">{error}</p> : null}
      <HeartbeatActions
        active={draft.active}
        saving={saving}
        t={t}
        onStop={() => {
          void clear(sessionId, t, setDraft, setError)
        }}
      />
    </form>
  )
}

function useHeartbeatDraft(sessionId: string | null, setDraft: (draft: HeartbeatDraft) => void): void {
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setDraft(emptyHeartbeatDraft())
    void getIde()
      .session.heartbeatGet({ sessionId })
      .then((raw) => {
        if (!cancelled) setDraft(draftFromHeartbeat(raw))
      })
      .catch(() => {
        if (!cancelled) setDraft(emptyHeartbeatDraft())
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, setDraft])
}

function HeartbeatActions({
  active,
  saving,
  t,
  onStop
}: {
  active: boolean
  saving: boolean
  t: ReturnType<typeof useT>
  onStop: () => void
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="submit"
        disabled={saving}
        className="h-7 cursor-pointer rounded-md border border-border-button-default px-2 text-caption-1-medium text-text-primary"
      >
        {t("chat.heartbeatSave")}
      </button>
      {active ? (
        <button
          type="button"
          className="h-7 cursor-pointer rounded-md px-2 text-caption-1-medium text-text-secondary"
          onClick={onStop}
        >
          {t("chat.heartbeatStop")}
        </button>
      ) : null}
    </div>
  )
}

async function submit(
  sessionId: string,
  draft: HeartbeatDraft,
  t: ReturnType<typeof useT>,
  setDraft: (draft: HeartbeatDraft) => void,
  setError: (value: string | null) => void,
  setSaving: (value: boolean) => void
): Promise<void> {
  setSaving(true)
  const failed = await saveHeartbeat(sessionId, draft, t)
  setSaving(false)
  setError(failed)
  if (!failed) setDraft({ ...draft, active: true, paused: false })
}

async function clear(
  sessionId: string,
  t: ReturnType<typeof useT>,
  setDraft: (draft: HeartbeatDraft) => void,
  setError: (value: string | null) => void
): Promise<void> {
  const failed = await stopHeartbeat(sessionId, t)
  setError(failed)
  if (!failed) setDraft(emptyHeartbeatDraft())
}
