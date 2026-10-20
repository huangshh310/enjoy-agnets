/**
 * 排队一次性提示。列表在对话末尾虚线泡，这里不再重复计数。
 * 画在哪由 runtimeHintPlacement 定：有审批卡时这里（输入框帽檐）一条都不画，
 * 「马上发」类提示改由 DockRuntimeHint 画在审批卡上方（#158 gate P1）。
 */
import { useEffect, useState } from "react"
import { RiCloseLine } from "@remixicon/react"
import { useT, type TranslateFn } from "@renderer/i18n"
import { followupPausedReason, listFollowups, setRuntimeHint, subscribeFollowups, visibleRuntimeHint, type RuntimeHintCode } from "@renderer/hooks/followup-queue"
import { useChatStore } from "@renderer/stores/chat-store"
import { STACKED_PANEL_CLASS_NAME } from "../stacked-rail/composer-stacked-styles"
import { runtimeHintPlacement } from "./runtime-hint-placement"

export function ComposerFollowupRail() {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const approvalPending = useChatStore((state) => state.pendingApproval != null)
  const [hint, setHint] = useState<RuntimeHintCode>(() => visibleRuntimeHint(sessionId))
  const [nextText, setNextText] = useState(() => nextQueuedText(sessionId))
  const [paused, setPaused] = useState(() => followupPausedReason(sessionId) != null)
  useEffect(() => {
    const sync = () => {
      setHint(visibleRuntimeHint(sessionId))
      setNextText(nextQueuedText(sessionId))
      setPaused(followupPausedReason(sessionId) != null)
    }
    sync()
    return subscribeFollowups(sync)
  }, [sessionId])
  if (!hint) return null
  // E1：队列停着时排队区连同暂停说明行也在输入框上方，「将在当前任务完成后执行」既重复又不对（runtimeHintPlacement 的 paused）。
  if (runtimeHintPlacement(hint, approvalPending, listFollowups(sessionId).length, paused) !== "frame") return null

  return (
    <div className={`${STACKED_PANEL_CLASS_NAME} flex items-center gap-1.5 px-3 py-1`}>
      <p className="min-w-0 flex-1 truncate text-caption-2-regular text-text-secondary">
        {hintLabel(hint, t, nextText)}
      </p>
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={() => setRuntimeHint(null)}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      >
        <RiCloseLine className="size-3" aria-hidden />
      </button>
    </div>
  )
}

export function nextQueuedText(sessionId: string | null): string {
  const item = listFollowups(sessionId)[0]
  const raw = item?.draft || item?.prompt || ""
  return raw.replace(/\s+/g, " ").trim().slice(0, 80)
}

export function hintLabel(hint: RuntimeHintCode, t: TranslateFn, nextText: string) {
  if (hint === "chipQueued" || hint === "queued") {
    return nextText ? t("chat.runtimeQueuedNext", { text: nextText }) : t("chat.runtimeQueuedHint")
  }
  if (hint === "steered") return t("chat.runtimeSteeredHint")
  if (hint === "imageSteerQueued") return t("chat.runtimeImageSteerQueuedHint")
  return ""
}
