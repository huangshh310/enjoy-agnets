/**
 * 档案跳转：openSession 必须带 sessionId，禁止只落到 `/`。
 */
import type { useNavigate } from "@tanstack/react-router"
import { focusAttention } from "@renderer/components/attention/focus-attention"
import type { InboxActionKey } from "../inbox.types"

type InboxNavigate = ReturnType<typeof useNavigate>

export function openInboxAction(
  navigate: InboxNavigate,
  actionKey: InboxActionKey,
  sessionId?: string
): void {
  if (actionKey !== "openSession") return
  if (!sessionId) return
  void focusAttention({ sessionId, navigate })
}
