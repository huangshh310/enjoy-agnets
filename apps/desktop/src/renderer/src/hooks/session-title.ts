/**
 * 首轮用户消息用 useCompletion 同路径精炼会话标题。
 */
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { completePrompt } from "./use-completion"
import { waitForRunOutput } from "./wait-run-events"

export function applyOptimisticTitle(userText: string) {
  const store = useChatStore.getState()
  if (!store.sessionId || store.sessionTitle !== "New agent") return
  store.setSession(store.sessionId, userText.replace(/\s+/g, " ").slice(0, 42) || "New agent")
}

export async function completeSessionTitle(userText: string) {
  const store = useChatStore.getState()
  if (!hasIde() || !store.sessionId) return
  const userTurns = store.messages.filter((message) => message.role === "user").length
  if (userTurns > 1) return
  try {
    const result = (await completePrompt({
      sessionId: store.sessionId,
      modelId: store.modelId,
      prompt: `Write a 4-8 word session title for this request. Reply with the title only.\n\n${userText.slice(0, 500)}`
    })) as { runId: string }
    const output = await waitForRunOutput(result.runId)
    const title = sanitizeTitle(output.text)
    if (!title) return
    const renamed = (await getIde().session.rename({
      sessionId: store.sessionId,
      title
    })) as { title: string }
    useChatStore.getState().setSession(store.sessionId, renamed.title)
  } catch {
    // 失败保留 maybeRenameSession / 乐观标题，不打断主循环
  }
}

function sanitizeTitle(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\s+/g, " ").slice(0, 80)
}
