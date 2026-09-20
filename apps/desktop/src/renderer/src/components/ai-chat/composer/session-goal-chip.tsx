/**
 * 会话目标芯片与 Recap：
 * 1. 目标只落库（session.patch），不进模型。
 * 2. Recap 由 session.recap 生成入库；下一轮 send-composer-run 垫 [Session Recap] system 句。
 */
import { useState, type KeyboardEvent } from "react"
import { RiCheckLine, RiCompass3Line, RiLoader4Line, RiSparkling2Line } from "@remixicon/react"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"

export function SessionGoalChip({
  className,
  layout = "bar"
}: {
  className?: string
  /** menu：底栏溢出，不占探索|执行旁。 */
  layout?: "bar" | "menu"
} = {}) {
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
    <div
      className={cx(
        "text-caption-2-medium",
        layout === "menu" ? "flex flex-col gap-0.5" : "inline-flex items-center gap-1.5",
        className
      )}
    >
      {/* 目标展示 / 编辑 */}
      {isEditing ? (
        <div className="flex h-6 items-center gap-1 rounded-full border border-accent-500 bg-background-primary-default px-2 shadow-2xs">
          <RiCompass3Line className="size-3 text-accent-500 shrink-0" />
          <input
            type="text"
            value={goalDraft}
            autoFocus
            placeholder={t("chat.setGoalPlaceholder")}
            onChange={(e) => setGoalDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void handleSaveGoal()}
            className="w-32 bg-transparent text-caption-2-medium text-text-primary focus:outline-hidden"
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
          className={cx(
            "group inline-flex cursor-pointer items-center gap-1 text-text-secondary transition-colors hover:text-text-primary",
            layout === "menu"
              ? "h-8 w-full rounded-lg px-2 hover:bg-background-secondary-hover"
              : "h-6 max-w-[180px] rounded-full border border-border-button-default bg-background-primary-default/80 px-2 hover:border-border-button-hover"
          )}
        >
          <RiCompass3Line className="size-3 text-accent-500 shrink-0" />
          <span className="truncate">{currentGoal}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStartEdit}
          className={cx(
            "inline-flex cursor-pointer items-center gap-1 text-text-tertiary transition-colors hover:text-text-secondary",
            layout === "menu"
              ? "h-8 w-full rounded-lg px-2 hover:bg-background-secondary-hover"
              : "h-6 rounded-full px-2 hover:bg-background-tertiary-default"
          )}
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
        className={cx(
          "inline-flex cursor-pointer items-center gap-1 text-text-tertiary transition-colors hover:text-text-secondary disabled:opacity-50",
          layout === "menu"
            ? "h-8 w-full rounded-lg px-2 hover:bg-background-secondary-hover"
            : "h-6 rounded-full px-2 hover:bg-background-tertiary-default"
        )}
      >
        {isRecapping ? (
          <RiLoader4Line className="size-3 animate-spin text-accent-500 shrink-0" />
        ) : (
          <RiSparkling2Line className="size-3 text-accent-500 shrink-0" />
        )}
        <span>{t("chat.generateRecap")}</span>
      </button>
    </div>
  )
}
