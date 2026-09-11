/**
 * 有历史切引擎确认坞：贴 Composer 同宽，摘要默认折叠。
 * 确认后摘要只进隐藏上下文。
 */
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { focusAttention } from "@renderer/components/ai-chat/attention/focus-attention"
import { useT } from "@renderer/i18n"
import { attentionKindFromEvent } from "@renderer/stores/attention/ingest-attention"
import { useChatStore } from "@renderer/stores/chat-store"
import { HandoffFileList } from "./handoff-file-list"
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
  const phase = useEngineHandoffStore((state) => state.phase)
  const t = useT()
  if (phase === "idle") return null
  return (
    <section
      data-frost="tile"
      className="w-full rounded-xl border border-border-button-default bg-background-secondary-default/95 px-3 py-2 shadow-2xs backdrop-blur-md"
      aria-label={t("chat.handoff.title")}
    >
      <HandoffCardHead fromLabel={fromLabel} toLabel={toLabel} onCancelRestore={onCancelRestore} />
      {phase === "blocked_by_approval" ? null : <HandoffCardBrief />}
    </section>
  )
}

function HandoffCardHead({
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
  const blocked = phase === "blocked_by_approval"
  const busy = phase === "disposing"

  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-caption-1-semibold text-text-primary">{t("chat.handoff.title")}</h2>
        <p className="mt-0.5 truncate text-caption-2-medium text-text-secondary">
          {t("chat.handoff.route", { from: fromLabel, to: toLabel })}
        </p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
          {blocked ? t("chat.handoff.blocked") : t("chat.handoff.body")}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
        {blocked ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => reviewHandoffApproval(onCancelRestore, navigate)}
          >
            {t("chat.handoff.reviewApproval")}
          </Button>
        ) : (
          <Button type="button" size="sm" disabled={busy} onClick={() => void confirmEngineHandoff()}>
            {t("chat.handoff.confirm")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onCancelRestore(cancelEngineHandoff())}
        >
          {t("chat.handoff.cancel")}
        </Button>
      </div>
    </div>
  )
}

function reviewHandoffApproval(
  onCancelRestore: (fromRuntimeId: string | null) => void,
  navigate: ReturnType<typeof useNavigate>
) {
  onCancelRestore(cancelEngineHandoff())
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

function HandoffCardBrief() {
  const t = useT()
  const draftSummary = useEngineHandoffStore((state) => state.draftSummary)
  const filePaths = useEngineHandoffStore((state) => state.filePaths)
  const setDraftSummary = useEngineHandoffStore((state) => state.setDraftSummary)
  const [summaryOpen, setSummaryOpen] = useState(false)

  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setSummaryOpen((open) => !open)}
        className="self-start text-caption-2-medium text-text-tertiary outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        aria-expanded={summaryOpen}
      >
        {summaryOpen ? t("chat.handoff.collapseSummary") : t("chat.handoff.expandSummary")}
      </button>
      {summaryOpen ? (
        <textarea
          value={draftSummary}
          onChange={(event) => setDraftSummary(event.target.value)}
          rows={3}
          aria-label={t("chat.handoff.summaryLabel")}
          className="w-full resize-none rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2 text-caption-1-regular text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        />
      ) : null}
      <HandoffFileList files={filePaths} />
    </div>
  )
}
