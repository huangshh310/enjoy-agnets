/**
 * agent.run 返回后认领 runId。leo MUST 1（#136）竞态：出字前失败可能先于 agent.run 返回到达，
 * 已经回滚、running=false、红卡已出——这时认领必失败，但不能当「孤儿 run」中止并盖成「发送失败」，
 * 建会话窗的排队首发也不能因此删掉会话。
 */
import { isDiscardedPreOutputRun } from "../../stores/discarded-pre-output-runs.ts"

export type LaunchSettle = "discarded" | "claimed" | "orphan"

export function settleLaunchedRun(
  sessionId: string | null,
  runId: string,
  claim: (sessionId: string | null, runId: string) => boolean
): LaunchSettle {
  if (isDiscardedPreOutputRun(runId)) return "discarded"
  return claim(sessionId, runId) ? "claimed" : "orphan"
}
