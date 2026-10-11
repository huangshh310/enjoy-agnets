/**
 * 会话截断稳定码。agent.run / session.truncateFrom 共用，禁止 throw 让 IPC 加前缀。
 */
import { z } from "zod"

export const TRUNCATE_STALE_SNAPSHOT = "TRUNCATE_STALE_SNAPSHOT"
export const TRUNCATE_RUN_ACTIVE = "TRUNCATE_RUN_ACTIVE"
export const TRUNCATE_MESSAGE_NOT_FOUND = "TRUNCATE_MESSAGE_NOT_FOUND"
/** 外发用户句的 id 已落在别的会话：不开跑、不挂 run（leo 小修 2）。 */
export const MESSAGE_ID_SESSION_MISMATCH = "MESSAGE_ID_SESSION_MISMATCH"

export const SessionTruncateErrorCode = z.enum([
  TRUNCATE_STALE_SNAPSHOT,
  TRUNCATE_RUN_ACTIVE,
  TRUNCATE_MESSAGE_NOT_FOUND
])
export type SessionTruncateErrorCode = z.infer<typeof SessionTruncateErrorCode>

/** 截断名单上限（soft 2）：单个 id ≤ 128 字符，名单 ≤ 200 条。超了直接拒，不进 main。 */
export const TRUNCATE_ID_MAX_CHARS = 128
export const TRUNCATE_TAIL_MAX_IDS = 200
export const TruncateMessageId = z.string().min(1).max(TRUNCATE_ID_MAX_CHARS)
export const TruncateTailIds = z.array(TruncateMessageId).max(TRUNCATE_TAIL_MAX_IDS)

export const SessionTruncateOk = z.object({ ok: z.literal(true), deleted: z.number().int() }).strict()
export const SessionTruncateBlocked = z
  .object({ ok: z.literal(false), code: SessionTruncateErrorCode })
  .strict()
export const SessionTruncateResult = z.discriminatedUnion("ok", [
  SessionTruncateOk,
  SessionTruncateBlocked
])
export type SessionTruncateResult = z.infer<typeof SessionTruncateResult>
