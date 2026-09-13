/**
 * 会话目标芯片与 Recap (Synara 灵感)：
 * 1. 目标设置与即时保存。
 * 2. 阶段总结 Recap 生成、悬浮查看与静默上下文注入。
 */
import { useState, type KeyboardEvent } from "react"
import { RiCheckLine, RiCompass3Line, RiLoader4Line, RiSparkling2Line } from "@remixicon/react"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function SessionGoalChip() {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const sessionNode = useChatStore((state) =>
    state.repositories.find((r) => r.id === sessionId)
  )

  const [isEditing, setIsEditing] = useState(false)
  const [goalDraft, setGoalDraft] = useState("")
  const [isRecapping, setIsRecapping] = useState(false)

  if (!sessionId || !sessionNode) return null

  const currentGoal = sessionNode.goal || ""
  const currentRecap = sessionNode.recap || ""

  function handleStartEdit() {
    setGoalDraft(currentGoal)
    setIsEditing(true)
  }

  async function handleSaveGoal() {
    setIsEditing(false)
    const nextGoal = goalDraft.trim() || null
    if (nextGoal === (sessionNode?.goal || null)) return
    try {
      await getIde().session.patch({ id: sessionId!, goal: nextGoal })
      useChatStore.getState().patchSessionNode(sessionId!, { goal: nextGoal })
    } catch {
      // 忽略失败
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      void handleSaveGoal()
    } else if (e.key === "Escape") {
      setIsEditing(false)
    }
  }

  async function handleGenerateRecap() {
    if (isRecapping || !sessionId) return
    setIsRecapping(true)
    try {
      const res = (await getIde().session.recap({ sessionId })) as { recap: string }
      if (res?.recap) {
        useChatStore.getState().patchSessionNode(sessionId, { recap: res.recap })
      }
    } catch {
      // 静默失败
    } finally {
      setIsRecapping(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-1 text-caption-2-medium">
      {/* 目标展示 / 编辑 */}
      {isEditing ? (
        <div className="flex items-center gap-1 rounded-full border border-accent-500 bg-background-primary-default px-2 py-0.5 shadow-2xs">
          <RiCompass3Line className="size-3 text-accent-500 shrink-0" />
          <input
            type="text"
            value={goalDraft}
            autoFocus
            placeholder={t("chat.setGoalPlaceholder")}
            onChange={(e) => setGoalDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void handleSaveGoal()}
            className="w-36 bg-transparent text-caption-2-medium text-text-primary focus:outline-hidden"
          />
          <button
            type="button"
            onClick={() => void handleSaveGoal()}
            className="cursor-pointer text-accent-600 hover:text-accent-500"
          >
            <RiCheckLine className="size-3" />
          </button>
        </div>
      ) : currentGoal ? (
        <button
          type="button"
          onClick={handleStartEdit}
          title={t("chat.editGoalTitle")}
          className="group inline-flex max-w-[220px] cursor-pointer items-center gap-1 rounded-full border border-border-button-default bg-background-primary-default/80 px-2 py-0.5 text-text-secondary transition-colors hover:border-border-button-hover hover:text-text-primary"
        >
          <RiCompass3Line className="size-3 text-accent-500 shrink-0" />
          <span className="truncate">{currentGoal}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStartEdit}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-border-button-default px-2 py-0.5 text-text-tertiary transition-colors hover:border-border-button-hover hover:text-text-secondary"
        >
          <RiCompass3Line className="size-3 shrink-0" />
          <span>{t("chat.addGoal")}</span>
        </button>
      )}

      {/* Recap 阶段总结 */}
      <button
        type="button"
        onClick={() => void handleGenerateRecap()}
        disabled={isRecapping}
        title={currentRecap ? `${t("chat.recapTooltipPrefix")}\n${currentRecap}` : t("chat.generateRecapTitle")}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border-button-default bg-background-primary-default/60 px-2 py-0.5 text-text-secondary transition-colors hover:border-border-button-hover hover:text-text-primary disabled:opacity-50"
      >
        {isRecapping ? (
          <RiLoader4Line className="size-3 animate-spin text-accent-500 shrink-0" />
        ) : (
          <RiSparkling2Line className="size-3 text-accent-500 shrink-0" />
        )}
        <span>{currentRecap ? "Recap" : t("chat.generateRecap")}</span>
      </button>
    </div>
  )
}
