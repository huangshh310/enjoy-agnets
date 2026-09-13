/**
 * 档案跳转：openSession 必须带 sessionId，禁止只落到 `/`。
 */
import type { useNavigate } from "@tanstack/react-router"
import { focusAttention } from "@renderer/components/ai-chat/attention/focus-attention"
import type { AttentionKind } from "@renderer/stores/attention/attention.types"
import type { InboxActionKey } from "../inbox.types"

type InboxNavigate = ReturnType<typeof useNavigate>

export function openInboxAction(
  navigate: InboxNavigate,
  actionKey: InboxActionKey,
  sessionId?: string,
  workspaceId?: string,
  kind?: AttentionKind | "running" | "aborted"
): void {
  if (actionKey !== "openSession") return
  if (!sessionId) return
  const attentionKind = kind === "running" || kind === "aborted" ? undefined : kind
  void focusAttention({ sessionId, workspaceId, kind: attentionKind, navigate })
}
