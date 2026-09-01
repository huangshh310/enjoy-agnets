/**
 * 助手消息重新生成 (Regenerate) 与用户消息编辑重发 (Edit & Resend) 核心调度模块。
 * 遵循 Vercel AI SDK 7 的消息上下文裁剪与多轮调度规范。
 */
import { getIde, hasIde } from "../lib/ide"
import { useChatStore, type ChatStore } from "../stores/chat-store"
import { composerRunKind } from "./composer-run-kind"

function currentCaps(store: ChatStore) {
  return store.models.find((model) => model.id === store.modelId)?.capabilities
}

/** 重新生成指定助手消息轮次 */
export async function regenerateAssistantTurn(assistantMessageId: string): Promise<void> {
  const store = useChatStore.getState()
  if (store.running || !hasIde()) return
  if (!store.workspaceId || !store.sessionId) return

  const messages = store.messages
  const targetIndex = messages.findIndex((m) => m.id === assistantMessageId)
  if (targetIndex === -1) return

  // 往前寻找对应的用户 Prompt
  let userIndex = -1
  for (let i = targetIndex - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      userIndex = i
      break
    }
  }
  if (userIndex === -1) return

  const userMessage = messages[userIndex]
  if (!userMessage) return

  // 截断至该用户消息（保留到 user 消息，丢弃后续旧回复）
  const truncatedMessages = messages.slice(0, userIndex + 1)
  const runKind = composerRunKind(store.modelId, currentCaps(store))

  const pendingId = `msg_pending_${Date.now()}`
  const nextMessages = [
    ...truncatedMessages,
    {
      id: pendingId,
      role: "assistant" as const,
      content: "",
      createdAt: Date.now(),
      streaming: true,
      thoughtSeconds: undefined,
      sources: undefined,
      assets: undefined,
      structured: undefined,
      runKind
    }
  ]

  store.setMessages(nextMessages)
  store.setRunning(true)
  store.setError(null)

  const assetIds = (userMessage.assets ?? []).map((a) => a.assetId)
  const history = truncatedMessages.map((m) => ({
    role: m.role,
    content: m.content,
    reasoning: m.reasoning
  }))

  try {
    if (runKind === "image" || runKind === "video") {
      await getIde().ai.generate({
        kind: runKind,
        sessionId: store.sessionId,
        workspaceId: store.workspaceId ?? undefined,
        modelId: store.modelId,
        prompt: userMessage.content,
        messages: history,
        attachments: assetIds
      })
    } else {
      await getIde().agent.run({
        sessionId: store.sessionId,
        workspaceId: store.workspaceId,
        modelId: store.modelId,
        mode: store.mode,
        reasoningEffort: store.reasoningEffort,
        messages: history,
        attachments: assetIds
      })
    }
  } catch (err: unknown) {
    store.setError(err instanceof Error ? err.message : "Regeneration failed.")
    store.setRunning(false)
  }
}

/** 编辑指定用户消息并重新发送生成 */
export async function editAndResendUserTurn(
  userMessageId: string,
  newContent: string
): Promise<void> {
  const store = useChatStore.getState()
  if (store.running || !hasIde()) return
  if (!store.workspaceId || !store.sessionId) return
  if (!newContent.trim()) return

  const messages = store.messages
  const userIndex = messages.findIndex((m) => m.id === userMessageId)
  if (userIndex === -1) return

  const oldUserMsg = messages[userIndex]
  if (!oldUserMsg) return

  const updatedUserMsg = {
    ...oldUserMsg,
    content: newContent.trim(),
    createdAt: Date.now()
  }

  // 截断到当前用户消息位置并替换内容
  const truncatedMessages = [...messages.slice(0, userIndex), updatedUserMsg]
  const runKind = composerRunKind(store.modelId, currentCaps(store))

  const pendingId = `msg_pending_${Date.now()}`
  const nextMessages = [
    ...truncatedMessages,
    {
      id: pendingId,
      role: "assistant" as const,
      content: "",
      createdAt: Date.now(),
      streaming: true,
      thoughtSeconds: undefined,
      sources: undefined,
      assets: undefined,
      structured: undefined,
      runKind
    }
  ]

  store.setMessages(nextMessages)
  store.setRunning(true)
  store.setError(null)

  const assetIds = (oldUserMsg.assets ?? []).map((a) => a.assetId)
  const history = truncatedMessages.map((m) => ({
    role: m.role,
    content: m.content,
    reasoning: m.reasoning
  }))

  try {
    if (runKind === "image" || runKind === "video") {
      await getIde().ai.generate({
        kind: runKind,
        sessionId: store.sessionId,
        workspaceId: store.workspaceId ?? undefined,
        modelId: store.modelId,
        prompt: newContent.trim(),
        messages: history,
        attachments: assetIds
      })
    } else {
      await getIde().agent.run({
        sessionId: store.sessionId,
        workspaceId: store.workspaceId,
        modelId: store.modelId,
        mode: store.mode,
        reasoningEffort: store.reasoningEffort,
        messages: history,
        attachments: assetIds
      })
    }
  } catch (err: unknown) {
    store.setError(err instanceof Error ? err.message : "Execution failed.")
    store.setRunning(false)
  }
}
