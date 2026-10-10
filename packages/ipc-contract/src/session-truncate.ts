/**
 * 会话截断稳定码。agent.run / session.truncateFrom 共用，禁止 throw 让 IPC 加前缀。
 */
import { z } from "zod"

export const TRUNCATE_STALE_SNAPSHOT = "TRUNCATE_STALE_SNAPSHOT"
export const TRUNCATE_RUN_ACTIVE = "TRUNCATE_RUN_ACTIVE"
export const TRUNCATE_MESSAGE_NOT_FOUND = "TRUNCATE_MESSAGE_NOT_FOUND"

export const SessionTruncateErrorCode = z.enum([
  TRUNCATE_STALE_SNAPSHOT,
  TRUNCATE_RUN_ACTIVE,
  TRUNCATE_MESSAGE_NOT_FOUND
])
export type SessionTruncateErrorCode = z.infer<typeof SessionTruncateErrorCode>

export const SessionTruncateOk = z.object({ ok: z.literal(true), deleted: z.number().int() }).strict()
export const SessionTruncateBlocked = z
  .object({ ok: z.literal(false), code: SessionTruncateErrorCode })
  .strict()
export const SessionTruncateResult = z.discriminatedUnion("ok", [
  SessionTruncateOk,
  SessionTruncateBlocked
])
export type SessionTruncateResult = z.infer<typeof SessionTruncateResult>
