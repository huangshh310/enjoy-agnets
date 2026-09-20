/**
 * 会话目标与 Recap：落库；下一轮 send 垫进模型（气泡剥掉）。
 */
import { useState, type KeyboardEvent } from "react"
import { RiCheckLine, RiCompass3Line } from "@remixicon/react"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
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
  const currentRecap = sessionNode.recap || ""

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
      const res = (await getIde().session.recap({ sessionId })) as { recap: string }
      if (!res?.recap) {
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
      <GoalRow
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
        <p className="px-2 text-caption-2-regular text-text-warning-primary">{goalError}</p>
      ) : null}
      {layout === "menu" ? (
        <SessionRecapButton
          recap={currentRecap}
          recapping={isRecapping}
          error={recapError}
          onGenerate={() => void handleGenerateRecap()}
        />
      ) : (
        <SessionRecapButton
          recap=""
          recapping={isRecapping}
          error={recapError}
          onGenerate={() => void handleGenerateRecap()}
        />
      )}
    </div>
  )
}

function GoalRow({
  layout,
  editing,
  draft,
  current,
  onDraft,
  onStart,
  onSave,
  onKeyDown
}: {
  layout: "bar" | "menu"
  editing: boolean
  draft: string
  current: string
  onDraft: (value: string) => void
  onStart: () => void
  onSave: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}) {
  const t = useT()
  if (editing) {
    return (
      <div
        className={cx(
          "flex items-center gap-1 border border-accent-500 bg-background-primary-default px-2 shadow-2xs",
          layout === "menu" ? "h-8 w-full rounded-lg" : "h-6 rounded-full"
        )}
      >
        <RiCompass3Line className="size-3 shrink-0 text-accent-500" />
        <input
          type="text"
          value={draft}
          autoFocus
          placeholder={t("chat.setGoalPlaceholder")}
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onSave}
          className="min-w-0 flex-1 bg-transparent text-caption-2-medium text-text-primary focus:outline-hidden"
        />
        <button type="button" onClick={onSave} className="cursor-pointer text-accent-600 hover:text-accent-500">
          <RiCheckLine className="size-3" />
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onStart}
      title={current ? t("chat.editGoalTitle") : undefined}
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 transition-colors",
        layout === "menu"
          ? "h-8 w-full rounded-lg px-2 hover:bg-background-secondary-hover"
          : "h-6 max-w-[180px] rounded-full px-2 hover:bg-background-tertiary-default",
        current ? "text-text-secondary hover:text-text-primary" : "text-text-tertiary hover:text-text-secondary"
      )}
    >
      <RiCompass3Line className={cx("size-3 shrink-0", current && "text-accent-500")} />
      <span className="min-w-0 truncate">{current || t("chat.addGoal")}</span>
    </button>
  )
}
