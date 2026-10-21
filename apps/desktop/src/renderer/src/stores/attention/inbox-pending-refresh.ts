/**
 * 收件箱「等你决定」与左栏徽标什么时候向 main 重拉（真源是 main 的 approvals.pending）。
 * 原来只跟 Attention 槽变化走：用户停掉的那一轮，迟到的 approval.required / approval.resolved 在渲染端被丢掉，
 * 停止收尾 run.error 是安静的，槽不变——要是停止前恰好拉过一次（库里那时还有 decision=null 的行），
 * main 随后把审批结清成 cancelled，徽标也不会再拉，一直挂着（jojo 巡检 54a533a2 B）。
 * 所以凡是可能改动「未决审批」的事件（含被停那一轮被丢掉的），都敲一下节拍让徽标重拉。
 */
import { create } from "zustand"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import type { AttentionItem } from "./attention.types"

const TOUCHES_PENDING = new Set<StreamEvent["type"]>(["approval.required", "approval.resolved", "run.end", "run.error"])

export const useInboxPendingEpoch = create<{ epoch: number }>(() => ({ epoch: 0 }))

/** dispatchAgentEvent 最先调用：在被停那一轮的事件被丢掉之前。 */
export function noteInboxPendingEvent(event: StreamEvent): void {
  if (!TOUCHES_PENDING.has(event.type)) return
  useInboxPendingEpoch.setState((state) => ({ epoch: state.epoch + 1 }))
}

/** Attention 槽的指纹：槽出现 / 收掉 / 换类型时重拉。 */
export function attentionRefreshTick(items: readonly AttentionItem[]): string {
  return items.map((item) => `${item.id}:${item.status}:${item.kind}`).join("|")
}

/** 徽标重拉的完整依据（hook 里拆成两个 selector；行为测试直接看这一个）。 */
export function inboxPendingRefreshKey(items: readonly AttentionItem[], epoch: number): string {
  return `${attentionRefreshTick(items)}#${epoch}`
}
