/**
 * jojo P2（main-150 巡检）：开泵前失败（附件需视觉模型 / 读不到附件 / 检索抛错）也走泵失败收口——
 * runs 落 failed + error、发 run.error、撤活 run。否则库里一直 running：
 * 「重新生成」被当活 run 拒截断（「还在运行或等你审批」），重启后红卡 / lastError 也没了。
 */
import { getActiveRun } from "./agent-run-state"
import { failAgentPump } from "./fail-agent-pump"

export async function failRunBeforePump(runId: string, error: unknown): Promise<void> {
  const current = getActiveRun(runId)
  if (!current) return
  await failAgentPump(runId, current, error)
}
