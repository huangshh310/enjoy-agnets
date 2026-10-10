/**
 * 助手消息重新生成 (Regenerate) 与用户消息编辑重发 (Edit & Resend) 核心调度模块。
 * 遵循 Vercel AI SDK 7 的消息上下文裁剪与多轮调度规范。
 */
import {
  isEmptyAssistantTurn,
  isTodoContinueUserMessage
} from "../components/ai-chat/composer/todo-continue-message"
import { requireAgentRunId } from "@enjoy-agents/ipc-contract/chat-readiness"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore, type ChatStore } from "../stores/chat-store"
import { abortOrphanedRun, claimComposerRun } from "./composer-run-control"
import { composerRunKind } from "./composer-run-kind"
import { continueTodoTurn } from "./continue-todo-turn"
import { codingAgentRunInput } from "./agent-run-payload"
import { isAcpComposerRuntime } from "../lib/agent-runtime"
import { pendingAssistantStamp } from "../lib/pending-assistant-stamp"
import { desktopBiasForRun } from "./runtime-interact/desktop-bias-for-run"
import { agentRunBlockedCode } from "@enjoy-agents/ipc-contract/chat-readiness"
import { loadSession } from "./session-lifecycle"
import { tailIdsAfterKeep } from "./session-truncate-intent"
import { isTruncateRetryable, translateTruncateNotice } from "./truncate-notice"

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
  const target = messages[targetIndex]

  if (isTodoContinueUserMessage(userMessage.content) || (target && isEmptyAssistantTurn(target))) {
    await continueTodoTurn()
    return
  }

  // 截断至该用户消息（保留到 user 消息，丢弃后续旧回复）
  const expectedTailIds = tailIdsAfterKeep(messages, userMessage.id)
  const truncatedMessages = messages.slice(0, userIndex + 1)
  const runKind = isAcpComposerRuntime(store.runtimeId)
    ? "agent"
    : composerRunKind(store.modelId, currentCaps(store))

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
      runKind,
      ...pendingAssistantStamp(store)
    }
  ]

  store.setMessages(nextMessages)
  store.setRunning(true)
  store.setError(null)
  const sessionId = store.sessionId

  const assetIds = (userMessage.assets ?? []).map((a) => a.assetId)
  const history = truncatedMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    reasoning: m.reasoning
  }))

  try {
    const started = await startTurnWithTruncateRetry(
      store,
      runKind,
      userMessage.content,
      history,
      assetIds,
      userMessage.id,
      expectedTailIds
    )
    if (agentRunBlockedCode(started)) return
    await claimStartedRun(sessionId, Promise.resolve(started))
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

  const expectedTailIds = tailIdsAfterKeep(messages, oldUserMsg.id)
  const truncatedMessages = [...messages.slice(0, userIndex), updatedUserMsg]
  const runKind = isAcpComposerRuntime(store.runtimeId)
    ? "agent"
    : composerRunKind(store.modelId, currentCaps(store))

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
      runKind,
      ...pendingAssistantStamp(store)
    }
  ]

  store.setMessages(nextMessages)
  store.setRunning(true)
  store.setError(null)
  const sessionId = store.sessionId

  const assetIds = (oldUserMsg.assets ?? []).map((a) => a.assetId)
  const history = truncatedMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    reasoning: m.reasoning
  }))

  try {
    const started = await startTurnWithTruncateRetry(
      store,
      runKind,
      newContent.trim(),
      history,
      assetIds,
      updatedUserMsg.id,
      expectedTailIds
    )
    if (agentRunBlockedCode(started)) return
    await claimStartedRun(sessionId, Promise.resolve(started))
  } catch (err: unknown) {
    store.setError(err instanceof Error ? err.message : "Execution failed.")
    store.setRunning(false)
  }
}

async function startTurnWithTruncateRetry(
  store: ChatStore,
  runKind: ReturnType<typeof composerRunKind>,
  prompt: string,
  history: Array<{
    id?: string
    role: ChatStore["messages"][number]["role"]
    content: string
    reasoning?: string
  }>,
  assetIds: string[],
  keepId: string,
  expectedTailIds: string[]
) {
  const first = await startTurnIpc(store, runKind, prompt, history, assetIds, keepId, expectedTailIds)
  const firstCode = agentRunBlockedCode(first)
  if (!isTruncateRetryable(firstCode) || !store.sessionId) {
    if (firstCode) {
      useChatStore.getState().setError(translateTruncateNotice(firstCode))
      useChatStore.getState().setRunning(false)
    }
    return first
  }
  await loadSession(store.sessionId, store.sessionTitle ?? "")
  const refreshed = useChatStore.getState()
  const keepIndex = refreshed.messages.findIndex((message) => message.id === keepId)
  const nextHistory = refreshed.messages.slice(0, keepIndex + 1).map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    reasoning: message.reasoning
  }))
  const nextTail = tailIdsAfterKeep(refreshed.messages, keepId)
  const retried = await startTurnIpc(refreshed, runKind, prompt, nextHistory, assetIds, keepId, nextTail)
  const retryCode = agentRunBlockedCode(retried)
  if (retryCode) {
    useChatStore.getState().setError(translateTruncateNotice(retryCode))
    useChatStore.getState().setRunning(false)
  }
  return retried
}

async function startTurnIpc(
  store: ChatStore,
  runKind: ReturnType<typeof composerRunKind>,
  prompt: string,
  history: Array<{
    id?: string
    role: ChatStore["messages"][number]["role"]
    content: string
    reasoning?: string
  }>,
  assetIds: string[],
  keepId: string,
  expectedTailIds: string[]
) {
  if (runKind === "image" || runKind === "video") {
    return getIde().ai.generate({
      kind: runKind,
      sessionId: store.sessionId,
      workspaceId: store.workspaceId ?? undefined,
      modelId: store.modelId,
      prompt,
      messages: history,
      attachments: assetIds
    })
  }
  const desktopBias = await desktopBiasForRun(prompt)
  return getIde().agent.run({
    ...codingAgentRunInput(store),
    messages: history,
    attachments: assetIds,
    commandId: crypto.randomUUID(),
    clearSessionAllow: true,
    truncateAfterMessageId: keepId,
    expectedTailIds,
    ...(desktopBias ? { desktopBias } : {})
  })
}

async function claimStartedRun(sessionId: string | null, started: Promise<unknown>) {
  const runId = requireAgentRunId(await started)
  if (!claimComposerRun(sessionId, runId)) abortOrphanedRun(runId)
}
