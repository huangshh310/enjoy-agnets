/**
 * 本会话红卡已在对话里摊开时，「需处理 · 出错」不再重复占顶栏（luna g152，733×480 会盖住红卡标题）。
 * 别的会话的出错照常显示。
 */
import type { AttentionItem } from "../../../stores/attention/attention.types"

export function hiddenByErrorCard(
  item: Pick<AttentionItem, "kind" | "sessionId">,
  input: { isChat: boolean; sessionId: string | null; errorCardVisible: boolean }
): boolean {
  return input.isChat && input.errorCardVisible && item.kind === "error" && item.sessionId === input.sessionId
}
