/**
 * 档案跳转：openSession 必须带 sessionId，禁止只落到 `/`。
 */
import type { useNavigate } from "@tanstack/react-router"
import { focusAttention } from "@renderer/components/ai-chat/attention/focus-attention"
import type { InboxCopyKey, InboxActionKey } from "../inbox.types"

type InboxNavigate = ReturnType<typeof useNavigate>

export function openInboxAction(
  navigate: InboxNavigate,
  actionKey: InboxActionKey,
  sessionId?: string,
  workspaceId?: string,
  kind?: InboxCopyKey
): void {
  if (actionKey !== "openSession") return
  if (!sessionId) return
  const attentionKind =
    kind === "pending_approval" || kind === "ask_user" || kind === "error" || kind === "complete"
      ? kind
      : undefined
  void focusAttention({ sessionId, workspaceId, kind: attentionKind, navigate })
}
