/**
 * 补跑开跑不阻塞回看链：只点火，不在 reconcile 里 await settle。
 */
import type { MissedReconcileResult } from "./automations-missed-reconcile.ts"

export type CatchUpLaunch = { automationId: string; scheduledAt: number }

export function listCatchUpLaunches(results: MissedReconcileResult[]): CatchUpLaunch[] {
  const launches: CatchUpLaunch[] = []
  for (const result of results) {
    const catchUp = result.actions.find((row) => row.type === "catch_up")
    if (catchUp) launches.push({ automationId: result.automationId, scheduledAt: catchUp.scheduledAt })
  }
  return launches
}
