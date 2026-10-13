/**
 * 顶部「出错 / 需处理」条的条目范围（luna 3cf0）：会话页里只列当前会话的；其它页面照常列全部。
 * 别的会话出错，侧栏会话行自己有红点，不靠这条。
 */
import type { AttentionItem } from "@renderer/stores/attention/attention.types"

export function scopeNeedsItems(
  visible: readonly AttentionItem[],
  scope: { isChat: boolean; sessionId: string | null }
): AttentionItem[] {
  return visible.filter(
    (item) => item.kind !== "complete" && (!scope.isChat || item.sessionId === scope.sessionId)
  )
}
