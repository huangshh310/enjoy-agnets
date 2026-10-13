/**
 * jojo P1：回灌时把库里最近一次真失败还原成红卡 + 重试目标。
 * store.error 只活在内存；inbox「失败」有档、打开会话却没条。
 */
import { getIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
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
