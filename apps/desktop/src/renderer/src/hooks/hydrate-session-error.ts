/**
 * jojo P1：回灌时把库里最近一次真失败还原成红卡 + 重试目标。
 * store.error 只活在内存；inbox「失败」有档、打开会话却没条。
 *
 * #151 合并约定（leo / host）：红卡（store.error）只由这里的 runs 表 lastError + 关闭水位决定；
 * Attention（#151）只管待处理条 / 侧栏红点 / 收件箱，不再写 store.error。
 * 关红卡同时落库水位 + 把本会话 Attention 出错槽标 dismissed，切回 / 重启都不复活。
 */
import { getIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import { useAttentionStore } from "../stores/attention/attention-store"
import { attentionSlotId } from "../stores/attention/ingest-attention"
import type { RetryTarget } from "./regenerate-retry-target"

type LastError = { runId?: string; message?: string } | null

export function retryTargetFromMessages(
  sessionId: string,
  messages: ReadonlyArray<{ id: string; role: string; content: string }>
): RetryTarget | null {
  const lastUser = [...messages].reverse().find((m) => m.role === "user" && m.content.trim())
  if (!lastUser) return null
  return { kind: "regenerate", sessionId, userId: lastUser.id }
}

/** 有活泵 / 已在跑时不盖红卡。 */
export async function restoreSessionErrorFromDb(
  sessionId: string,
  opts: { running: boolean; messages: ReadonlyArray<{ id: string; role: string; content: string }> }
): Promise<boolean> {
  if (opts.running) return false
  let last: LastError
  try {
    last = (await getIde().session.lastError({ sessionId })) as LastError
  } catch {
    return false
  }
  const message = typeof last?.message === "string" ? last.message.trim() : ""
  if (!message) return false
  const store = useChatStore.getState()
  if (store.sessionId !== sessionId) return false
  if (store.error === message) return true
  const target = retryTargetFromMessages(sessionId, opts.messages)
  store.setError(message, target ?? undefined)
  return true
}

/** leo：用户关红卡要落库（按 runId 水位），否则重启 loadSession 又还原出来。 */
export function dismissSessionErrorCard(): void {
  const store = useChatStore.getState()
  const sessionId = store.sessionId
  store.setError(null)
  if (!sessionId) return
  // #151：Attention 出错槽一起关掉，否则红点 / 待处理条 / 收件箱还挂着，下一次回灌又被它带出来。
  useAttentionStore.getState().dismiss(attentionSlotId(sessionId, "error"))
  try {
    void Promise.resolve(getIde().session.dismissError({ sessionId })).catch(() => undefined)
  } catch {
    /* 没桥（测试 / 早期启动）就只关内存卡 */
  }
}
