/**
 * 会话目标与 Recap：落库；下一轮 send 垫进模型（气泡剥掉）。
 */
import { useState, type KeyboardEvent } from "react"
import { SessionRecapResult } from "@enjoy-agents/ipc-contract"
import { recapIsHeuristic, visibleRecapText } from "@enjoy-agents/ipc-contract/session-recap-kind"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import { SessionGoalRow } from "./session-goal-row"
import { SessionRecapButton } from "./session-recap-button"

export function SessionGoalChip({
  className,
  layout = "bar"
}: {
  className?: string
  layout?: "bar" | "menu"
} = {}) {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const sessionNode = useChatStore((state) =>
    state.repositories.find((row) => row.id === sessionId)
  )
  const [isEditing, setIsEditing] = useState(false)
  const [goalDraft, setGoalDraft] = useState("")
  const [isRecapping, setIsRecapping] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [recapError, setRecapError] = useState<string | null>(null)

  if (!sessionId || !sessionNode) return null

  const currentGoal = sessionNode.goal || ""
  const storedRecap = sessionNode.recap || ""
  const currentRecap = visibleRecapText(storedRecap)
  const recapHeuristic = recapIsHeuristic(storedRecap)

  function handleStartEdit() {
    setGoalDraft(currentGoal)
    setGoalError(null)
    setIsEditing(true)
  }

  async function handleSaveGoal() {
    setIsEditing(false)
    const nextGoal = goalDraft.trim() || null
    if (nextGoal === (sessionNode?.goal || null)) return
    try {
      await getIde().session.patch({ id: sessionId!, goal: nextGoal })
      useChatStore.getState().patchSessionNode(sessionId!, { goal: nextGoal })
      setGoalError(null)
    } catch {
      setGoalError(t("chat.goalSaveFailed"))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      void handleSaveGoal()
    } else if (event.key === "Escape") {
      setIsEditing(false)
    }
  }

  async function handleGenerateRecap() {
    if (isRecapping || !sessionId) return
    setIsRecapping(true)
    setRecapError(null)
    try {
      const res = SessionRecapResult.parse(await getIde().session.recap({ sessionId }))
      if (!res.recap) {
        setRecapError(t("chat.recapFailed"))
        return
      }
      useChatStore.getState().patchSessionNode(sessionId, { recap: res.recap })
    } catch {
      setRecapError(t("chat.recapFailed"))
    } finally {
      setIsRecapping(false)
    }
  }

  return (
    <div
      className={cx(
        "text-caption-2-medium",
        layout === "menu" ? "flex flex-col gap-1" : "inline-flex items-center gap-1.5",
        className
      )}
    >
      <SessionGoalRow
        layout={layout}
        editing={isEditing}
        draft={goalDraft}
        current={currentGoal}
        onDraft={setGoalDraft}
        onStart={handleStartEdit}
        onSave={() => void handleSaveGoal()}
        onKeyDown={handleKeyDown}
      />
      {goalError ? (
        <p className="px-2 text-caption-2-regular text-status-yellow-text">{goalError}</p>
      ) : null}
      <SessionRecapButton
        recap={layout === "menu" ? currentRecap : ""}
        recapping={isRecapping}
        error={recapError}
        heuristic={recapHeuristic}
        onGenerate={() => void handleGenerateRecap()}
      />
    </div>
  )
}
