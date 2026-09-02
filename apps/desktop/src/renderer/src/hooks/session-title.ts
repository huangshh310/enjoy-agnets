/**
 * 依据会话内容自动精炼生成会话标题。
 */
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { completePrompt } from "./use-completion"
import { waitForRunOutput } from "./wait-run-events"

const DEFAULT_TITLES = new Set([
  "New agent",
  "新对话",
  "新会话",
  "未命名会话",
  "Untitled",
  "Untitled session",
  ""
])

export function isDefaultSessionTitle(title?: string | null): boolean {
  if (!title) return true
  const trimmed = title.trim()
  return !trimmed || DEFAULT_TITLES.has(trimmed)
}

export function sanitizeTitle(raw: string): string {
  return raw
    .replace(/^["'《「『\s]+|["'》」』\s]+$/g, "")
    .replace(/^(Title|Topic|会话标题|标题)[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .slice(0, 60)
    .trim()
}

export function formatOptimisticTitle(userText: string): string {
  return userText.replace(/\s+/g, " ").trim().slice(0, 42) || "新对话"
}

export function applyOptimisticTitle(userText: string) {
  const store = useChatStore.getState()
  if (!store.sessionId || !isDefaultSessionTitle(store.sessionTitle)) return
  store.setSession(store.sessionId, formatOptimisticTitle(userText))
}

export async function completeSessionTitle(userText: string) {
  const store = useChatStore.getState()
  if (!hasIde() || !store.sessionId) return
  // 只要当前标题仍是默认占位标题（无论第几轮），就执行智能精炼
  if (!isDefaultSessionTitle(store.sessionTitle)) return

  try {
    const result = (await completePrompt({
      sessionId: store.sessionId,
      modelId: store.modelId,
      prompt: `Generate a concise 3-8 word title for this conversation in the same language as the user input (e.g. if the request is Chinese, reply in concise Chinese). Reply with the title text ONLY, without quotes, prefixes, punctuations, or markdown.\n\nUser request:\n${userText.slice(0, 600)}`
    })) as { runId: string }
    const output = await waitForRunOutput(result.runId)
    const title = sanitizeTitle(output.text)
    if (!title || isDefaultSessionTitle(title)) return
    const renamed = (await getIde().session.rename({
      sessionId: store.sessionId,
      title
    })) as { title: string }
    useChatStore.getState().setSession(store.sessionId, renamed.title)
  } catch {
    // 失败保留 maybeRenameSession / 乐观标题，不打断主循环
  }
}
