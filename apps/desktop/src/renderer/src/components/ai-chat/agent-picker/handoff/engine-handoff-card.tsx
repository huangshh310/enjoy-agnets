/**
 * 有历史切引擎确认卡。摘要可编辑，确认后只进隐藏上下文。
 */
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { focusAttention } from "@renderer/components/ai-chat/attention/focus-attention"
import { useT } from "@renderer/i18n"
import { attentionKindFromEvent } from "@renderer/stores/attention/ingest-attention"
import { useChatStore } from "@renderer/stores/chat-store"
import {
  cancelEngineHandoff,
  confirmEngineHandoff,
  useEngineHandoffStore
} from "./engine-handoff-store"

export function EngineHandoffCard({
  fromLabel,
  toLabel,
  onCancelRestore
}: {
  fromLabel: string
  toLabel: string
  onCancelRestore: (fromRuntimeId: string | null) => void
}) {
  const t = useT()
  const navigate = useNavigate()
  const phase = useEngineHandoffStore((state) => state.phase)
  const draftSummary = useEngineHandoffStore((state) => state.draftSummary)
  const setDraftSummary = useEngineHandoffStore((state) => state.setDraftSummary)
  const blocked = phase === "blocked_by_approval"
  const busy = phase === "disposing"

  function restoreFrom() {
    onCancelRestore(cancelEngineHandoff())
  }

  function reviewApproval() {
    restoreFrom()
    const store = useChatStore.getState()
    if (!store.sessionId) return
    const pending = store.pendingApproval
    void focusAttention({
      sessionId: store.sessionId,
      workspaceId: store.workspaceId ?? undefined,
      kind: pending ? (attentionKindFromEvent(pending) ?? "pending_approval") : "pending_approval",
      navigate
    })
  }

  if (phase === "idle") return null

  return (
    <section
      className="w-full max-w-[40rem] rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card"
      aria-label={t("chat.handoff.title")}
    >
      <h2 className="text-title-3-semibold text-text-primary">{t("chat.handoff.title")}</h2>
      <p className="mt-1 text-caption-1-medium text-text-secondary">
        {t("chat.handoff.route", { from: fromLabel, to: toLabel })}
      </p>
      <p className="mt-1 text-caption-1-regular text-text-tertiary">
        {blocked ? t("chat.handoff.blocked") : t("chat.handoff.body")}
      </p>
      {blocked ? null : (
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-caption-2-medium text-text-tertiary">{t("chat.handoff.summaryLabel")}</span>
          <textarea
            value={draftSummary}
            onChange={(event) => setDraftSummary(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2 text-caption-1-regular text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          />
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {blocked ? (
          <Button type="button" size="sm" disabled={busy} onClick={reviewApproval}>
            {t("chat.handoff.reviewApproval")}
          </Button>
        ) : (
          <Button type="button" size="sm" disabled={busy} onClick={() => void confirmEngineHandoff()}>
            {t("chat.handoff.confirm")}
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={restoreFrom}>
          {t("chat.handoff.cancel")}
        </Button>
      </div>
    </section>
  )
}
