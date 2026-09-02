/**
 * 会话上下文压缩 IPC 合约：入参 Zod strict 校验，结构化记录压缩与节省指标。
 */
import { z } from "zod"

/** main 抛给 renderer 的稳定错误码，UI 再翻成词表。 */
export const COMPACTION_ERROR = {
  tooShort: "COMPACTION_TOO_SHORT",
  notEligible: "COMPACTION_NOT_ELIGIBLE"
} as const
export type CompactionErrorCode = (typeof COMPACTION_ERROR)[keyof typeof COMPACTION_ERROR]

/** 手动会话压缩入参 */
export const SessionCompactInput = z
  .object({
    sessionId: z.string().min(1),
    keepRecent: z.number().int().min(1).max(50).optional()
  })
  .strict()
export type SessionCompactInput = z.infer<typeof SessionCompactInput>

/** 会话压缩状态与摘要记录 */
export const SessionCompaction = z
  .object({
    sessionId: z.string().min(1),
    summary: z.string(),
    compactedMessageCount: z.number().int().nonnegative(),
    originalTokens: z.number().int().nonnegative(),
    compactedTokens: z.number().int().nonnegative(),
    savedTokens: z.number().int().nonnegative(),
    savedPercent: z.number().min(0).max(100),
    compactedAt: z.number()
  })
  .strict()
export type SessionCompaction = z.infer<typeof SessionCompaction>
