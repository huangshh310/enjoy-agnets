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
  if (last?.runId) restoredRunIds.set(sessionId, last.runId)
  const target = retryTargetFromMessages(sessionId, opts.messages)
  store.setError(message, target ?? undefined)
  return true
}

/** 本会话红卡来自哪个 run（还原时记下），关卡时带上做水位。 */
const restoredRunIds = new Map<string, string>()

type DismissIde = { session: { dismissError: (input: { sessionId: string; runId?: string }) => unknown } }

/** 落库关卡水位：失败重试一次，仍失败回调 onFailed（出 toast）。 */
export async function persistErrorDismiss(
  ide: DismissIde,
  input: { sessionId: string; runId?: string },
  onFailed?: () => void
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ok = await ide.session.dismissError(input)
      if (ok !== false) return true
    } catch {
      /* 再试一次 */
    }
  }
  onFailed?.()
  return false
}

/** leo：用户关红卡要落库（按 runId 水位），否则重启 loadSession 又还原出来。 */
export function dismissSessionErrorCard(opts?: { onPersistFailed?: () => void }): void {
  const store = useChatStore.getState()
  const sessionId = store.sessionId
  store.setError(null)
  if (!sessionId) return
  const attention = useAttentionStore.getState()
  const slotId = attentionSlotId(sessionId, "error")
  const slotRunId = attention.items.find((item) => item.id === slotId)?.runId || undefined
  const runId = restoredRunIds.get(sessionId) ?? slotRunId
  restoredRunIds.delete(sessionId)
  // #151：Attention 出错槽一起关掉，否则红点 / 待处理条 / 收件箱还挂着，下一次回灌又被它带出来。
  attention.dismiss(slotId)
  let ide: DismissIde
  try {
    ide = getIde() as unknown as DismissIde
  } catch {
    return /* 没桥（测试 / 早期启动）就只关内存卡 */
  }
  void persistErrorDismiss(ide, runId ? { sessionId, runId } : { sessionId }, opts?.onPersistFailed)
}
