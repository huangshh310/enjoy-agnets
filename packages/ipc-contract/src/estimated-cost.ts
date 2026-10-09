/**
 * COST-P3 估算成本合约：未知用 undefined，禁止把缺项当 0。
 * 单次缺量或缺单价就是 unknown；会话合计允许「已知部分 + N 次未知」。
 *
 * ACP `cost` 是会话累计值，不是本次 run 增量
 * （RFD：https://agentclientprotocol.com/rfds/session-usage 「Cumulative session cost」）。
 * 会话 `reportedUsd` 按结束时间取该 ACP 会话最后一个值，禁止把各 run 的累计值相加。
 * ACP 的 token（`usage_update.used`）是当前上下文占用，不是本次消耗；
 * 会话合计和 `runs[]` 都不要把它当成本次 token 消耗来展示。
 */
import { z } from "zod"

export const CostStatus = z.enum([
  "estimated",
  "unknown",
  "local_unbilled",
  "not_reported",
  "reported"
])
export type CostStatus = z.infer<typeof CostStatus>

export const CostSource = z.enum(["snapshot", "user", "engine", "mixed"])
export type CostSource = z.infer<typeof CostSource>

export const CostMissingItem = z.enum([
  "input",
  "output",
  "cacheRead",
  "cacheWrite",
  "reasoning",
  "price",
  "usage",
  "tier"
])
export type CostMissingItem = z.infer<typeof CostMissingItem>

/** 旧值 / 未知枚举降成 undefined，不要丢掉整行。 */
export const EstimatedCost = z.object({
  status: CostStatus.optional().catch(undefined),
  usd: z.number().optional(),
  source: CostSource.optional().catch(undefined),
  snapshotDate: z.string().optional(),
  snapshotVersion: z.string().optional(),
  missing: z.array(CostMissingItem).optional().catch(undefined)
})
export type EstimatedCost = z.infer<typeof EstimatedCost>

export const SessionRunEstimate = EstimatedCost.extend({
  runId: z.string().min(1),
  /** 仅用来挑 ACP 会话累计费用的最后一次，不是给 UI 展示的。 */
  endedAt: z.number().optional()
})
export type SessionRunEstimate = z.infer<typeof SessionRunEstimate>

export const SessionEstimatedCost = z.object({
  sessionId: z.string().min(1),
  knownUsd: z.number().optional(),
  unknownCount: z.number().int().nonnegative(),
  reportedUsd: z.number().optional(),
  runs: z.array(SessionRunEstimate).optional()
})
export type SessionEstimatedCost = z.infer<typeof SessionEstimatedCost>

export const SessionEstimatedCostInput = z
  .object({
    sessionId: z.string().min(1)
  })
  .strict()
export type SessionEstimatedCostInput = z.infer<typeof SessionEstimatedCostInput>

/** 本地不计费 / ACP 没上报：不进美元、不记「价格未知」。 */
export function summarizeSessionCosts(
  sessionId: string,
  runs: SessionRunEstimate[]
): SessionEstimatedCost {
  let knownUsd = 0
  let known = 0
  let unknownCount = 0
  let latestReported: { usd: number; endedAt: number; index: number } | undefined
  runs.forEach((run, index) => {
    if (run.status === "estimated" && typeof run.usd === "number") {
      knownUsd += run.usd
      known += 1
      return
    }
    if (run.status === "unknown") {
      unknownCount += 1
      return
    }
    if (run.status === "reported" && typeof run.usd === "number") {
      latestReported = pickLatestReported(latestReported, run, index)
    }
  })
  return {
    sessionId,
    ...(known > 0 ? { knownUsd } : {}),
    unknownCount,
    ...(latestReported ? { reportedUsd: latestReported.usd } : {}),
    runs
  }
}

/**
 * 取最后一个 ACP 累计值（按 endedAt，缺省则按数组顺序）。
 * 不用差值：usage_json 存的就是会话累计，没有本 run 开始时的基线，恢复后续算也稳。
 */
function pickLatestReported(
  current: { usd: number; endedAt: number; index: number } | undefined,
  run: SessionRunEstimate,
  index: number
): { usd: number; endedAt: number; index: number } {
  const next = {
    usd: run.usd as number,
    endedAt: run.endedAt ?? Number.NEGATIVE_INFINITY,
    index
  }
  if (!current) return next
  if (next.endedAt > current.endedAt) return next
  if (next.endedAt === current.endedAt && next.index > current.index) return next
  return current
}
