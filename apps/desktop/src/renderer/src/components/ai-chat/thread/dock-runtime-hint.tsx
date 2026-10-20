/**
 * 有审批卡时的「马上发」类一次性提示（#158 gate P1）。
 * 画在对话列里、紧凑排队行下方、审批卡正上方，和它们同列、正常文档流（不是浮层），所以不会盖住审批卡；
 * shrink-0 整行画，不被压半截。放不下（审批三钮被挤出对话列，或卡内正文被压成一条缝）就让位：
 * 只留一个 hidden 占位（不占高度），本条提示不再出来，审批三钮永远优先。
 * 文案见 chat.runtimeSteeredHint；× 关掉同一个运行时提示。
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { RiCloseLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { listFollowups, setRuntimeHint, subscribeFollowups, visibleRuntimeHint, type RuntimeHintCode } from "@renderer/hooks/followup-queue"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { hintLabel, nextQueuedText } from "../composer/runtime-interact/composer-followup-rail"
import { dockHintCrowded, runtimeHintPlacement } from "../composer/runtime-interact/runtime-hint-placement"
import { approvalBodySqueeze, approvalOverflow } from "./queued-followups"

export const DOCK_RUNTIME_HINT_TEST_ID = "dock-runtime-hint"

export function DockRuntimeHint() {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const approvalId = useChatStore((state) => state.pendingApproval?.approvalId ?? null)
  const [hint, setHint] = useState<RuntimeHintCode>(() => visibleRuntimeHint(sessionId))
  const [queuedCount, setQueuedCount] = useState(() => listFollowups(sessionId).length)
  useEffect(() => {
    const sync = () => {
      setHint(visibleRuntimeHint(sessionId))
      setQueuedCount(listFollowups(sessionId).length)
    }
    sync()
    return subscribeFollowups(sync)
  }, [sessionId])
  const placement = runtimeHintPlacement(hint, approvalId != null, queuedCount)
  const ref = useRef<HTMLDivElement>(null)
  const crowded = useCrowded(ref, placement === "dock", `${hint}:${approvalId}`)
  if (placement !== "dock") return null

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      data-testid={DOCK_RUNTIME_HINT_TEST_ID}
      data-state={crowded ? "crowded" : "shown"}
      hidden={crowded}
      // relative z-30：和紧凑排队行同层，盖过对话目录条（z-20），× 点得到。正常文档流，不 absolute。
      className={cx(
        // 让位时用 hidden 类（display:none，不占高度）；只靠 hidden 属性会被 flex 类盖掉。
        crowded ? "hidden" : "flex",
        "relative z-30 mx-6 min-h-6 shrink-0 items-center gap-1.5 rounded-xl py-0.5 pr-1 pl-3",
        "border border-border-button-default bg-background-secondary-default/60"
      )}
    >
      <p className="min-w-0 flex-1 truncate text-caption-2-regular text-text-secondary">
        {hintLabel(hint, t, nextQueuedText(sessionId))}
      </p>
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={() => setRuntimeHint(null)}
        className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      >
        <RiCloseLine className="size-3" aria-hidden />
      </button>
    </div>
  )
}

/**
 * 量一下：这条提示在的时候审批卡还放不放得下。放不下就让位，同一条提示（同一张审批卡）里不再回来，
 * 不会来回抖。useLayoutEffect 在绘制前跑，挤到审批卡的那一帧不会画出来。
 */
function useCrowded(ref: RefObject<HTMLDivElement | null>, enabled: boolean, key: string): boolean {
  const [crowded, setCrowded] = useState(false)
  useLayoutEffect(() => setCrowded(false), [key])
  useLayoutEffect(() => {
    if (!enabled || crowded) return
    const el = ref.current
    const column = el?.parentElement
    if (!el || !column) return
    const check = () => {
      if (dockHintCrowded({ approvalOverflowPx: approvalOverflow(column), approvalBodySqueezePx: approvalBodySqueeze(column) })) {
        setCrowded(true)
      }
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(column)
    const dock = column.querySelector('[data-testid="permission-dock"]')
    if (dock) observer.observe(dock)
    return () => observer.disconnect()
  }, [ref, enabled, crowded, key])
  return enabled && crowded
}
