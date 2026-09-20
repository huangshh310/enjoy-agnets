/**
 * 有 Goal / Recap 才画的上沿轨。不进探索|执行旁，空会话不占高。
 */
import { useState, type KeyboardEvent } from "react"
import { RiCloseLine, RiCompass3Line, RiPencilLine, RiSparkling2Line } from "@remixicon/react"
import { recapIsHeuristic, visibleRecapText } from "@enjoy-agents/ipc-contract/session-recap-kind"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ComposerStackedRow, stackedActionClass } from "./composer-stacked-row"
import { STACKED_DIVIDER_CLASS_NAME, STACKED_PANEL_CLASS_NAME } from "./composer-stacked-styles"

export function ComposerContextRail() {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const node = useChatStore((state) => state.repositories.find((row) => row.id === sessionId))
  const goal = node?.goal?.trim() || ""
  const storedRecap = node?.recap?.trim() || ""
  const recap = visibleRecapText(storedRecap)
  const heuristic = recapIsHeuristic(storedRecap)
  const [goalOpen, setGoalOpen] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  if (!sessionId || (!goal && !recap)) return null

  async function clearGoal() {
    if (!sessionId) return
    try {
      await getIde().session.patch({ id: sessionId, goal: null })
      useChatStore.getState().patchSessionNode(sessionId, { goal: null })
      setGoalOpen(false)
      setEditing(false)
    } catch {
      /* 失败留在轨上，溢出菜单仍能改 */
    }
  }

  async function saveGoal() {
    if (!sessionId) return
    const next = draft.trim() || null
    try {
      await getIde().session.patch({ id: sessionId, goal: next })
      useChatStore.getState().patchSessionNode(sessionId, { goal: next })
      setEditing(false)
      setGoalOpen(Boolean(next))
    } catch {
      setEditing(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      void saveGoal()
    } else if (event.key === "Escape") {
      setEditing(false)
    }
  }

  return (
    <div data-testid="composer-context-rail" className={STACKED_PANEL_CLASS_NAME}>
      {goal ? (
        <ComposerStackedRow
          icon={<RiCompass3Line className="size-3.5" />}
          label={t("chat.stackedGoal")}
          peek={goal}
          open={goalOpen}
          onToggle={() => {
            setGoalOpen((open) => !open)
            setEditing(false)
          }}
          actions={
            <>
              <button
                type="button"
                title={t("chat.editGoalTitle")}
                className={stackedActionClass()}
                onClick={() => {
                  setDraft(goal)
                  setEditing(true)
                  setGoalOpen(true)
                }}
              >
                <RiPencilLine className="size-3.5" />
              </button>
              <button
                type="button"
                title={t("chat.stackedClearGoal")}
                className={stackedActionClass()}
                onClick={() => void clearGoal()}
              >
                <RiCloseLine className="size-3.5" />
              </button>
            </>
          }
        >
          {editing ? (
            <input
              value={draft}
              autoFocus
              placeholder={t("chat.setGoalPlaceholder")}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              onBlur={() => void saveGoal()}
              className="h-7 w-full rounded-md border border-accent-500 bg-background-primary-default px-2 text-caption-2-medium text-text-primary outline-hidden"
            />
          ) : (
            <p className="whitespace-pre-wrap">{goal}</p>
          )}
        </ComposerStackedRow>
      ) : null}
      {goal && recap ? <div className={STACKED_DIVIDER_CLASS_NAME} /> : null}
      {recap ? (
        <ComposerStackedRow
          icon={<RiSparkling2Line className="size-3.5" />}
          label={heuristic ? t("chat.recapHeuristic") : t("chat.stackedRecap")}
          peek={recap}
          open={recapOpen}
          onToggle={() => setRecapOpen((open) => !open)}
        >
          <p className="line-clamp-4 whitespace-pre-wrap">{recap}</p>
        </ComposerStackedRow>
      ) : null}
    </div>
  )
}
