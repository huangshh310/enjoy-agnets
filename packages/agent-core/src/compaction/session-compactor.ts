/**
 * 会话上下文压缩：滑动窗口 + 事实摘要，只改发给模型的消息，不删 UI 历史。
 */
import type { SessionCompaction } from "@enjoy-agents/ipc-contract"

export interface MessageLike {
  role: string
  content: string
  reasoning?: string
}

export interface CompactSessionOptions {
  /** 保留最近未压缩的消息条数 */
  keepRecent?: number
  /** 预先生成的摘要（例如 main 里 generateText 的结果） */
  customSummary?: string
}

export interface CompactSessionResult {
  didCompact: boolean
  compaction?: SessionCompaction
  compactedMessages: MessageLike[]
}

/** 与看板同一套字符折算，禁止另写一套地板。 */
export const CHARS_PER_TOKEN = 3.8
export const DEFAULT_KEEP_RECENT = 4
export const CONVERSATION_SUMMARY_MARKER = "[CONVERSATION SUMMARY]"

/** 字符数折算 Token（与看板算法对齐） */
export function estimateMessageTokens(messages: readonly MessageLike[]): number {
  const chars = messages.reduce((sum, msg) => {
    return sum + (msg.content?.length ?? 0) + (msg.reasoning?.length ?? 0)
  }, 0)
  return Math.round(chars / CHARS_PER_TOKEN)
}

/**
 * 将较早消息压成一条 SUMMARY，只保留最近 N 条原文。
 */
export function compactSessionMessages(
  sessionId: string,
  messages: readonly MessageLike[],
  options: CompactSessionOptions = {}
): CompactSessionResult {
  const keepRecent = Math.max(1, options.keepRecent ?? DEFAULT_KEEP_RECENT)
  if (messages.length <= keepRecent) {
    return { didCompact: false, compactedMessages: [...messages] }
  }

  const splitIndex = messages.length - keepRecent
  const olderMessages = messages.slice(0, splitIndex)
  const recentMessages = messages.slice(splitIndex)
  const summary = options.customSummary || buildExtractedSummary(olderMessages)
  const compactedMessages = [toSummaryMessage(summary), ...recentMessages]
  const compaction = buildCompactionRecord({
    sessionId,
    summary,
    compactedMessageCount: olderMessages.length,
    originalTokens: estimateMessageTokens(messages),
    compactedTokens: estimateMessageTokens(compactedMessages)
  })

  return { didCompact: true, compaction, compactedMessages }
}

/**
 * 将保存的压缩状态应用到全量消息流，供发给 LLM 与 inspect preview。
 */
export function applySessionCompaction(
  messages: readonly MessageLike[],
  compaction: SessionCompaction | null | undefined
): MessageLike[] {
  if (!compaction || compaction.compactedMessageCount <= 0) {
    return [...messages]
  }
  const count = Math.min(messages.length, compaction.compactedMessageCount)
  return [toSummaryMessage(compaction.summary), ...messages.slice(count)]
}

function toSummaryMessage(summary: string): MessageLike {
  return {
    role: "user",
    content: `${CONVERSATION_SUMMARY_MARKER}\n${summary}`
  }
}

function buildCompactionRecord(input: {
  sessionId: string
  summary: string
  compactedMessageCount: number
  originalTokens: number
  compactedTokens: number
}): SessionCompaction {
  const savedTokens = Math.max(0, input.originalTokens - input.compactedTokens)
  const savedPercent =
    input.originalTokens > 0
      ? Number(Math.min(100, (savedTokens / input.originalTokens) * 100).toFixed(1))
      : 0
  return {
    sessionId: input.sessionId,
    summary: input.summary,
    compactedMessageCount: input.compactedMessageCount,
    originalTokens: input.originalTokens,
    compactedTokens: input.compactedTokens,
    savedTokens,
    savedPercent,
    compactedAt: Date.now()
  }
}

/** 规则回落：从较早消息抽文件路径与用户首行。 */
function buildExtractedSummary(olderMessages: readonly MessageLike[]): string {
  const keyPoints: string[] = []
  const filesMentioned = new Set<string>()

  for (const msg of olderMessages) {
    const fileMatches = msg.content.match(
      /(?:[a-zA-Z0-9_\-./\\]+\.(?:ts|tsx|js|jsx|json|md|css|html|py|rs|go))/g
    )
    if (fileMatches) {
      for (const file of fileMatches) {
        if (file.length < 80) filesMentioned.add(file)
      }
    }
    if (msg.role !== "user") continue
    const firstLine = msg.content.trim().split("\n")[0]?.slice(0, 100)
    if (firstLine && !keyPoints.includes(firstLine)) keyPoints.push(firstLine)
  }

  const sections: string[] = []
  if (keyPoints.length > 0) {
    sections.push(`Goals and instructions:\n${keyPoints.map((p) => `- ${p}`).join("\n")}`)
  }
  if (filesMentioned.size > 0) {
    const list = Array.from(filesMentioned).slice(0, 10)
    sections.push(`Files:\n${list.map((f) => `- ${f}`).join("\n")}`)
  }
  if (sections.length === 0) {
    sections.push("Earlier turns were compacted. Continue from the retained recent messages.")
  }
  return sections.join("\n\n")
}
