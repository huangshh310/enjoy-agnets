/**
 * 本会话允许 list / revoke IPC。只改会话表，本轮已种子的 ActiveRun 不动。
 */
import {
  ListSessionAllowsInput,
  ListSessionAllowsResult,
  RevokeSessionAllowInput,
  RevokeSessionAllowResult
} from "@enjoy-agents/ipc-contract/session-allow"
import {
  listConversationSessionAllows,
  revokeConversationSessionAllow
} from "./conversation-session-allow.ts"

export function listSessionAllowsForIpc(raw: unknown) {
  const { sessionId } = ListSessionAllowsInput.parse(raw)
  return ListSessionAllowsResult.parse({ items: listConversationSessionAllows(sessionId) })
}

export function revokeSessionAllowForIpc(raw: unknown) {
  const input = RevokeSessionAllowInput.parse(raw)
  const items = revokeConversationSessionAllow(input.sessionId, input.scope, input.runtimeId)
  return RevokeSessionAllowResult.parse({ ok: true as const, items })
}
