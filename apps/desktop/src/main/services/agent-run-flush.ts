/**
 * 从 ActiveRun 累积态决定要不要写助手消息。纯函数，供失败/中止/成功/checkpoint 共用。
 * 不碰 SQLite，方便 node:test 锁「关应用后回复消失」这条契约。
 */
import type { AssistantExtras, AssistantRunKind, ThreadToolCall } from "@enjoy-agents/ipc-contract"

export type FlushableRun = {
  assistantPersisted: boolean
  sessionId: string
  transcript: { visible: string; think: string }
  tools: ThreadToolCall[]
  startedAt: number
  extras: AssistantExtras
  runKind?: AssistantRunKind
  modelId?: string
  runtimeId?: string
  runId?: string
}

export type AssistantFlushPayload = {
  sessionId: string
  content: string
  reasoning: string
  tools: ThreadToolCall[]
  startedAt: number
  extras: AssistantExtras
  runKind?: AssistantRunKind
  modelId?: string
  runtimeId?: string
  runId?: string
}

/** 流式 checkpoint 最短间隔：每个 token 都写库会拖慢 ACP 长跑。 */
export const CHECKPOINT_INTERVAL_MS = 1500

const FORCE_CHECKPOINT = new Set(["tool.result", "approval.required"])
const THROTTLED_CHECKPOINT = new Set(["text.delta", "reasoning.delta"])

/**
 * 要不要把当前 transcript 刷进同一条助手消息。
 * 工具结果 / 审批停车立刻写；正文与思考按间隔节流。
 */
export function shouldCheckpointPersist(
  eventType: string,
  lastCheckpointAt: number,
  now: number
): boolean {
  if (FORCE_CHECKPOINT.has(eventType)) return true
  if (!THROTTLED_CHECKPOINT.has(eventType)) return false
  return now - lastCheckpointAt >= CHECKPOINT_INTERVAL_MS
}

/**
 * 有正文 / 工具就拿出 payload。`assistantPersisted` 只表示已有助手行 id，
 * 禁止再挡 UPDATE，否则允许后的 tool.result / 收工态写不进库，重启会转圈。
 */
export function flushPayloadFromRun(run: FlushableRun): AssistantFlushPayload | null {
  if (!hasAssistantPersistableBody(run)) return null
  return {
    sessionId: run.sessionId,
    content: run.transcript.visible,
    reasoning: run.transcript.think,
    tools: run.tools,
    startedAt: run.startedAt,
    extras: run.extras,
    runKind: run.runKind,
    modelId: run.modelId,
    runtimeId: run.runtimeId,
    runId: run.runId
  }
}

export function hasAssistantPersistableBody(run: {
  transcript: { visible: string; think: string }
  tools: ThreadToolCall[]
  extras: AssistantExtras
}): boolean {
  return Boolean(
    run.transcript.visible.trim() ||
      run.transcript.think.trim() ||
      run.tools.length > 0 ||
      run.extras.sources?.length ||
      run.extras.assets?.length ||
      run.extras.structured != null
  )
}
