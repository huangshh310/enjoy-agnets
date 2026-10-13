/**
 * 收件箱默认页签 / 左栏徽标（luna #151）。
 * - 没指定页签进来时：当前页签空就跳到第一个有条目的（拍板 → 待验收 → 失败）；用户手动点过就不动。
 * - 左栏徽标：待拍板 + 还没好的失败会话，都算「要你看一眼」。
 */
import type { InboxCategory } from "../inbox.types.ts"

const ORDER: InboxCategory[] = ["approval", "needs_review", "failed"]

export function pickDefaultInboxTab(
  counts: Record<InboxCategory, number>,
  current: InboxCategory
): InboxCategory {
  if (counts[current] > 0) return current
  return ORDER.find((tab) => counts[tab] > 0) ?? current
}

export function inboxRailCount(input: {
  liveSessionIds: ReadonlySet<string>
  pendingApprovalSessionIds: readonly string[]
  attentionItems: ReadonlyArray<{ sessionId: string; kind: string; status: string }>
}): number {
  if (input.liveSessionIds.size === 0) return 0
  const approvals = input.pendingApprovalSessionIds.filter((id) => input.liveSessionIds.has(id)).length
  const failed = new Set(
    input.attentionItems
      .filter(
        (item) =>
          item.kind === "error" &&
          (item.status === "active" || item.status === "focused") &&
          input.liveSessionIds.has(item.sessionId)
      )
      .map((item) => item.sessionId)
  )
  return approvals + failed.size
}
