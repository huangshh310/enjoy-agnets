/**
 * 会话压缩编排：读历史、生成摘要、落库，并给 runner / inspect 注入 SUMMARY。
 */
import {
  applySessionCompaction,
  compactSessionMessages,
  DEFAULT_KEEP_RECENT,
  estimateMessageTokens,
  shouldAutoCompact,
  type MessageLike
} from "@enjoy-agents/agent-core/compaction"
import { COMPACTION_ERROR, parseAssistantPayload, SessionCompaction } from "@enjoy-agents/ipc-contract"
import { listMessages } from "./session-queries"
import { clearInspectPromptSnapshot } from "./inspect-prompt-snapshot"
import { generateAiSummary } from "./session-compaction-summary"
import {
  clearSessionCompaction,
  getSessionCompaction,
  persistSessionCompaction
} from "./session-compaction-store"

export { clearSessionCompaction, getSessionCompaction }

/** 接近窗口或消息过多时自动压缩；太短则忽略。 */
export async function maybeAutoCompact(
  sessionId: string,
  messages: MessageLike[],
  contextWindow?: number
): Promise<boolean> {
  if (
    !shouldAutoCompact({
      messageCount: messages.length,
      estimatedTokens: estimateMessageTokens(messages),
      contextWindow
    })
  ) {
    return false
  }
  try {
    await compactSession(sessionId)
    return true
  } catch {
    return false
  }
}

/** 对会话执行手动上下文压缩 */
export async function compactSession(
  sessionId: string,
  keepRecent = DEFAULT_KEEP_RECENT
): Promise<SessionCompaction> {
  const history = await loadHistory(sessionId)
  if (history.length <= 2) {
    throw new Error(COMPACTION_ERROR.tooShort)
  }

  const splitIndex = Math.max(1, history.length - keepRecent)
  const customSummary = await generateAiSummary(history.slice(0, splitIndex))
  const result = compactSessionMessages(sessionId, history, { keepRecent, customSummary })
  if (!result.didCompact || !result.compaction) {
    throw new Error(COMPACTION_ERROR.notEligible)
  }

  persistSessionCompaction(result.compaction)
  clearInspectPromptSnapshot(sessionId)
  return result.compaction
}

/** 供 prompt preview 与 agent runner 消费的压缩历史注入 */
export async function getActiveCompactedHistory(
  sessionId: string,
  rawHistory: MessageLike[]
): Promise<MessageLike[]> {
  const compaction = await getSessionCompaction(sessionId)
  if (!compaction) return rawHistory
  return applySessionCompaction(rawHistory, compaction)
}

async function loadHistory(sessionId: string): Promise<MessageLike[]> {
  const rows = await listMessages(sessionId)
  return rows.map((row) => {
    if (row.role === "assistant") {
      const parsed = parseAssistantPayload(row.content)
      return { role: "assistant", content: parsed.content, reasoning: parsed.reasoning }
    }
    return { role: row.role, content: row.content }
  })
}
