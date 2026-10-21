/**
 * 把当前会话的排队项画在时间线末尾。
 * 有审批卡时（placement="dock"）：消息区只剩一条缝，排在时间线末尾的排队卡会被滚到页头下面、按钮被挡或点偏到审批卡上
 * （pr136-gate3 / pr157-gate-52、53）。这时改画在审批卡正上方、不随消息滚动的紧凑行里，时间线里不再重复画。
 *
 * 紧凑区让位规则（luna g158 锁定）：审批按钮永远可见，排队区先让位。
 * - 排队行整行画（不被压半截）；审批卡正文在卡内滚、先让到卡的最小高度（标题 + 三钮）；
 * - 再放不下（三钮被挤出对话列，或 2 条以上时计划卡正文只剩一条缝）：折叠成一行「排队 N 条」，点一下展开；
 *   空间回来够放全部行时自动复原；
 * - 点开后排队区自己让位（flex-shrink 远大于审批卡，最少留一行、区内滚），审批三钮仍露出；
 * - 3 条及以上：最多画 2 行，第 3 行换成「还有 N 条」，点开看全部；
 * - 层级高于对话目录条（thread-preview-rail，z-20），× 不会点到目录刻度上（g158-39）。
 *
 * E1（luna 定稿）：队列因停止 / 出错 / 额度停着时，同样画在输入框正上方的紧凑区，最上面加一行说明（QueuePausedRow），
 * 排队行本身不变；窗口高 ≤600 时整区折成一行「已暂停 · 排队 N 条」，点开展开。
 *
 * mike P3（#163 巡检）：
 * - 点开后区内滚（滚动条是隐藏的）：底下还藏着排队行时，区底贴一行「还有 N 条」，点一下滚到底——不再有行悄悄压在输入框上沿下面；
 * - 点开过，窗口再被拉到 ≤600 高：重新折成一行（refoldOnShort，m211-33）；
 * - 停着且对话里挂着失败卡：给对话区留 data-keep-thread，chat-stage 据此给对话区保底高度，「再发一次」整颗露出。
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import {
  followupPausedReason,
  listFollowups,
  subscribeFollowups,
  type FollowupItem,
  type FollowupPausedReason
} from "@renderer/hooks/followup-queue"
import { useShortWindow } from "@renderer/hooks/use-short-window"
import { QueuePausedRow, QueuePausedIcon } from "./queue-paused-row"
import { pausedCollapsed } from "./queue-paused-view"
import { keepThreadForFailureCard, refoldOnShort, rowsHiddenBelow } from "./queue-dock-layout"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { QueuedUserTurn } from "./turns/queued-user-turn"

/** 不展开时最多画几条排队行；再多的用「还有 N 条」一行代替。 */
export const DOCK_VISIBLE_ROWS = 2

export function QueuedFollowups({ placement = "thread" }: { placement?: "thread" | "dock" }) {
  const sessionId = useChatStore((state) => state.sessionId)
  const approvalPending = useChatStore((state) => state.pendingApproval != null)
  const [items, setItems] = useState<FollowupItem[]>(() => listFollowups(sessionId))
  const [paused, setPaused] = useState<FollowupPausedReason | null>(() => followupPausedReason(sessionId))

  useEffect(() => {
    const sync = () => {
      setItems(listFollowups(sessionId))
      setPaused(followupPausedReason(sessionId))
    }
    sync()
    return subscribeFollowups(sync)
  }, [sessionId])

  if (items.length === 0) return null
  if (shouldDockQueuedFollowups(approvalPending, paused) !== (placement === "dock")) return null

  // 审批卡在时说明行让位（审批按钮优先），但排队行的标签仍按「停着」说「已暂停」（luna P3a）：
  // 不能一边停着一边说「排队中」，像是审批完就会自动发。
  if (placement === "dock") {
    return <DockedFollowups items={items} paused={approvalPending ? null : paused} queuePaused={paused != null} />
  }

  return (
    <div id="queued-followups" className="flex flex-col gap-4">
      {items.map((item, index) => (
        <QueuedUserTurn
          key={item.id}
          item={item}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        />
      ))}
    </div>
  )
}

function DockedFollowups({
  items,
  paused,
  queuePaused
}: {
  items: FollowupItem[]
  /** 要画说明行的暂停原因（审批卡在时为 null）。 */
  paused: FollowupPausedReason | null
  /** 队列实际停着（不管说明行画不画）：排队行标签说「已暂停」。 */
  queuePaused: boolean
}) {
  const t = useT()
  const approvalId = useChatStore((state) => state.pendingApproval?.approvalId ?? null)
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const short = useShortWindow()
  // 换了一张审批卡 / 暂停原因变了：回到默认（不展开）。
  useEffect(() => setExpanded(false), [approvalId, paused])
  // 点开过，窗口再被拉矮到 ≤600：重新折起（m211-33）。
  const wasShort = useRef(short)
  useEffect(() => {
    if (refoldOnShort(wasShort.current, short)) setExpanded(false)
    wasShort.current = short
  }, [short])
  // 停着 + 对话里挂着失败卡：对话区保底高度（chat-stage 按 data-keep-thread 加 min-h），失败卡按钮整颗露出。
  const keepThread = useChatStore((state) => keepThreadForFailureCard(paused != null, state.error))
  if (paused && pausedCollapsed(short, expanded)) {
    return (
      <div
        ref={ref}
        id="queued-followups"
        data-testid="queued-followups-docked"
        data-mode="paused-collapsed"
        data-paused={paused}
        data-count={items.length}
        data-keep-thread={keepThread ? "true" : undefined}
        className="relative z-30 mx-6 flex shrink-0 flex-col py-0.5"
      >
        <DockSummaryButton
          testId="queue-paused-collapsed"
          label={t("chat.queuePausedCollapsed", { n: items.length })}
          icon={<QueuePausedIcon reason={paused} />}
          onClick={() => setExpanded(true)}
        />
      </div>
    )
  }
  return (
    <DockedRows
      items={items}
      paused={paused}
      queuePaused={queuePaused}
      expanded={expanded}
      setExpanded={setExpanded}
      dockRef={ref}
      keepThread={keepThread}
    />
  )
}

function DockedRows({
  items,
  paused,
  queuePaused,
  expanded,
  setExpanded,
  dockRef: ref,
  keepThread
}: {
  items: FollowupItem[]
  paused: FollowupPausedReason | null
  queuePaused: boolean
  expanded: boolean
  setExpanded: (value: boolean) => void
  dockRef: RefObject<HTMLDivElement | null>
  keepThread: boolean
}) {
  const t = useT()
  const tight = useDockTight(ref, !expanded, items.length)
  const mode = dockMode(items.length, tight, expanded)
  const hiddenBelow = useRowsHiddenBelow(ref, mode === "all", items.length)

  const visible = mode === "more" ? items.slice(0, DOCK_VISIBLE_ROWS) : items
  return (
    <div
      ref={ref}
      id="queued-followups"
      data-testid="queued-followups-docked"
      data-mode={mode}
      data-paused={paused ?? undefined}
      data-count={items.length}
      data-keep-thread={keepThread ? "true" : undefined}
      data-hidden-below={hiddenBelow > 0 ? hiddenBelow : undefined}
      // 默认整行画（shrink-0）；用户点开后才让位：shrink 远大于审批卡（PermissionDock 是 shrink 1），最少留一行、区内滚。
      // relative z-30：盖过对话目录条（z-20），× 点得到。
      className={cx(
        "relative z-30 mx-6 flex flex-col gap-1 overflow-y-auto [scrollbar-width:none]",
        expanded ? "max-h-[9.5rem] min-h-9 shrink-[1000] py-1" : "shrink-0",
        !expanded && (mode === "collapsed" ? "py-0.5" : "py-1")
      )}
    >
      {paused ? <QueuePausedRow reason={paused} count={items.length} /> : null}
      {mode === "collapsed" ? (
        <DockSummaryButton testId="queued-collapsed" label={t("chat.runtimeQueueCount", { n: items.length })} onClick={() => setExpanded(true)} />
      ) : (
        <>
          {visible.map((item, index) => (
            <QueuedUserTurn
              key={item.id}
              item={item}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
              compact
              paused={queuePaused}
            />
          ))}
          {mode === "more" ? (
            <DockSummaryButton
              testId="queued-more"
              label={t("chat.runtimeQueueMore", { n: items.length - DOCK_VISIBLE_ROWS })}
              onClick={() => setExpanded(true)}
            />
          ) : null}
          {hiddenBelow > 0 ? (
            // 区内滚、滚动条隐藏：底下还有行时贴底一行「还有 N 条」，点一下滚到底（sticky，实底盖住后面的行）。
            <DockSummaryButton
              testId="queued-hidden-below"
              label={t("chat.runtimeQueueMore", { n: hiddenBelow })}
              className="sticky bottom-0 z-10 border-solid bg-background-secondary-default"
              onClick={() => ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" })}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

function DockSummaryButton({
  testId,
  label,
  icon,
  className,
  onClick
}: {
  testId: string
  label: string
  icon?: ReactNode
  className?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-expanded={false}
      onClick={onClick}
      className={cx(
        "flex min-h-6 w-full shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-border-button-default",
        "bg-background-secondary-default/60 py-0.5 pr-2 pl-3 text-left text-caption-2-medium text-text-secondary hover:text-text-primary",
        className
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <RiArrowDownSLine className="size-3.5 shrink-0" aria-hidden />
    </button>
  )
}

export type DockMode = "collapsed" | "more" | "all"

/** 紧凑区画法：放不下 → 一行「排队 N 条」；3 条及以上 → 2 行 +「还有 N 条」；用户点开后全部（区内滚）。 */
export function dockMode(count: number, tight: boolean, expanded: boolean): DockMode {
  if (expanded) return "all"
  if (tight && count > 0) return "collapsed"
  if (count > DOCK_VISIBLE_ROWS) return "more"
  return "all"
}

/**
 * 审批卡底栏（三钮）被挤出对话列，或 2 条以上时卡内正文不足 40px → 折叠。
 * 折叠后记下当时对话列的高度和还差多少；对话列长高到够放下全部行时再复原（滞回，不来回抖）。
 * 对话列的高度只由外面的分栏 / composer 决定，和这里画几行无关，所以不会自激。
 */
function useDockTight(ref: RefObject<HTMLDivElement | null>, enabled: boolean, count: number): boolean {
  const [tight, setTight] = useState(false)
  const restoreAtRef = useRef<number | null>(null)
  useLayoutEffect(() => {
    restoreAtRef.current = null
    setTight(false)
  }, [count, enabled])
  useLayoutEffect(() => {
    if (!enabled) return
    const el = ref.current
    const column = el?.parentElement
    if (!el || !column) return
    const check = () => {
      const columnHeight = column.clientHeight
      if (restoreAtRef.current != null) {
        if (columnHeight >= restoreAtRef.current) {
          restoreAtRef.current = null
          setTight(false)
        }
        return
      }
      // 「马上发」提示（DockRuntimeHint）挤到审批卡时它自己先让位，这里不为它折叠排队行。
      const missing = approvalOverflow(column) + (count > 1 ? approvalBodySqueeze(column) : 0) - dockHintHeight(column)
      if (missing > 1) {
        restoreAtRef.current = columnHeight + missing + 2
        setTight(true)
      }
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(column)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, enabled, count])
  return enabled && tight
}

/**
 * 点开后（区内滚）量一下：可视区底边以下还藏着几条排队行。滚动、区 / 行尺寸变化时重量。
 * 「还有 N 条」行自己是 sticky 的，不参与计数（只数 queued-user-turn）。
 */
function useRowsHiddenBelow(ref: RefObject<HTMLDivElement | null>, enabled: boolean, count: number): number {
  const [hidden, setHidden] = useState(0)
  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const rows = Array.from(el.querySelectorAll<HTMLElement>(':scope > [data-testid="queued-user-turn"]'))
    const next = rowsHiddenBelow(
      rows.map((row) => row.getBoundingClientRect().bottom),
      el.getBoundingClientRect().bottom
    )
    setHidden((prev) => (prev === next ? prev : next))
  }, [ref])
  useLayoutEffect(() => {
    if (!enabled) {
      setHidden(0)
      return
    }
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener("scroll", measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of Array.from(el.children)) observer.observe(child)
    return () => {
      el.removeEventListener("scroll", measure)
      observer.disconnect()
    }
  }, [ref, enabled, count, measure])
  return enabled ? hidden : 0
}

/** 审批卡上方「马上发」提示占的高度；没画 / 已让位（display:none）为 0。 */
function dockHintHeight(column: HTMLElement): number {
  const hint = column.querySelector<HTMLElement>(':scope > [data-testid="dock-runtime-hint"]')
  return hint ? hint.getBoundingClientRect().height : 0
}

/** 审批卡底栏（三钮）超出对话列底边多少 px；没超出 / 没有审批卡为 0。 */
export function approvalOverflow(column: HTMLElement): number {
  const footer = column.querySelector('[data-testid="permission-dock"] article > footer')
  if (!footer) return 0
  return Math.max(0, footer.getBoundingClientRect().bottom - column.getBoundingClientRect().bottom)
}

/** 卡内正文只剩一条缝（< 40px 且内容更多）时还差多少 px：计划卡至少要露出文件名那一行（luna g158-05）。 */
const APPROVAL_BODY_MIN_PX = 40
export function approvalBodySqueeze(column: HTMLElement): number {
  const body = column.querySelector<HTMLElement>('[data-testid="permission-dock"] [data-testid="approval-card-body"]')
  if (!body) return 0
  return Math.max(0, Math.min(body.scrollHeight, APPROVAL_BODY_MIN_PX) - body.clientHeight)
}

/** 有审批卡时排队项挂到审批卡上方；队列停着时（E1）挂到输入框正上方。都不在时间线里。 */
export function shouldDockQueuedFollowups(approvalPending: boolean, paused: FollowupPausedReason | null = null): boolean {
  return approvalPending || paused != null
}
