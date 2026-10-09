/**
 * COST-P3 估算成本合约：未知用 undefined，禁止把缺项当 0。
 * 单次缺量或缺单价就是 unknown；会话合计允许「已知部分 + N 次未知」。
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
  "usage"
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
  runId: z.string().min(1)
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
  let reportedUsd = 0
  let reported = 0
  for (const run of runs) {
    if (run.status === "estimated" && typeof run.usd === "number") {
      knownUsd += run.usd
      known += 1
      continue
    }
    if (run.status === "unknown") {
      unknownCount += 1
      continue
    }
    if (run.status === "reported" && typeof run.usd === "number") {
      reportedUsd += run.usd
      reported += 1
    }
  }
  return {
    sessionId,
    ...(known > 0 ? { knownUsd } : {}),
    unknownCount,
    ...(reported > 0 ? { reportedUsd } : {}),
    runs
  }
}
