/**
 * 运行时一次性提示（排队 / 马上发 / 图片插话退回）画在哪。纯函数，便于单测。
 *
 * - 没审批卡：画在输入框上方的帽檐里（frame）。
 * - 有审批卡：帽檐属于 Composer，Composer 此时 shrink-0，帽檐每多一行，对话列就被压一行，
 *   733x480 下审批卡只剩标题、三钮被挤到帽檐底下（#158 gate P1，pr158-gate-09）。
 *   所以「马上发」类提示改画在对话列里、审批卡正上方的紧凑区（dock），和排队行同一列、正常文档流，
 *   不浮层、不压审批卡；放不下时它先让位（不画），审批三钮永远优先。
 * - 有审批卡时排队类提示（下一句 / 将在当前任务完成后执行）本来就不画：紧凑排队行已经在。
 * - E1 队列停着（paused）：排队类提示哪儿都不画——暂停说明行已经写明「排队的 N 条先不发」，
 *   再说「将在当前任务完成后执行」既重复又不对。「马上发 / 图片插话退回」不受影响，照常按审批卡在不在画在帽檐或紧凑区。
 */
import type { RuntimeHintCode } from "@renderer/hooks/followup-queue"

export type RuntimeHintPlacement = "frame" | "dock" | null

export function runtimeHintPlacement(
  hint: RuntimeHintCode,
  approvalPending: boolean,
  queuedCount: number,
  /** E1：这个会话的排队停着（followupPausedReason 非空）。 */
  paused = false
): RuntimeHintPlacement {
  if (!hint) return null
  const queuedKind = hint === "queued" || hint === "chipQueued"
  // 队列已空时不再挂「将在当前任务完成后执行」（jojo 巡检）。
  if (queuedKind && queuedCount === 0) return null
  if (queuedKind && paused) return null
  if (!approvalPending) return "frame"
  // 有审批卡时排队项已经挂在审批卡上方的紧凑行里，再挂一条是重复（luna g158-03、36）。
  if (queuedKind) return null
  return "dock"
}

export type DockHintMetrics = {
  /** 审批卡底栏（三钮）超出对话列底边多少 px。 */
  approvalOverflowPx: number
  /** 审批卡正文比最小可读高度还差多少 px。 */
  approvalBodySqueezePx: number
}

/** 紧凑区提示是否挤到了审批卡：三钮被挤出，或卡内正文被压成一条缝 → 提示让位（不画）。 */
export function dockHintCrowded(metrics: DockHintMetrics): boolean {
  return metrics.approvalOverflowPx + metrics.approvalBodySqueezePx > 1
}
