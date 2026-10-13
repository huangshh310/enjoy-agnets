/**
 * 会话级改动（luna P2 / 待验收「N 项」）：只算本会话写盘 run 自首个写盘 run 基线以来改过的文件。
 * 跑前就脏、且内容没被本会话改过的文件（如 e2e-stub.txt）不计入；没有写盘 run 的会话 = 0。
 */
import { z } from "zod"

export const SessionChangesInput = z.object({ sessionId: z.string().min(1) }).strict()

export const SessionChangesResult = z.object({
  sessionId: z.string(),
  /** 会话改过的路径（相对工作区根，git porcelain 口径）。 */
  paths: z.array(z.string()),
  /** = paths.length。侧栏 +N / 「N 项」用这个。 */
  sessionChangeCount: z.number().int().nonnegative(),
  /** 本会话有没有写盘 run（写型工具且不是只读 bash）。false 时 count 恒为 0。 */
  hasWritingRuns: z.boolean(),
  /**
   * known=有基线快照、git 正常，count 可信；
   * unknown=有写盘 run 但读不到基线 / git 出错（fail-closed：调用方保持原整仓口径，不归零）；
   * none=没有写盘 run。
   */
  baseline: z.enum(["known", "unknown", "none"])
})
export type SessionChangesResult = z.infer<typeof SessionChangesResult>
