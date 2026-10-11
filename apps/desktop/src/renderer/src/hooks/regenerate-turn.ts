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
import { resolveTruncateTail } from "./resolve-truncate-tail"
import { clearRetryTarget, rememberRetryTarget } from "./regenerate-retry-target"
import { translateTruncateNotice } from "./truncate-notice"
import {
  isBlockedStart,
  startWithTruncateRetry,
  TRUNCATE_TAIL_CHANGED,
  type RetryHistoryEntry
} from "./truncate-retry"

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

  // 截断至该用户消息（保留到 user 消息，丢弃后续旧回复）。
  // jojo P1：名单必须是库 id（视图助手气泡是占位 id），先读库对账；对不上就刷新提示，不截。
  const sessionAtStart = store.sessionId
  rememberRetryTarget({ kind: "regenerate", sessionId: sessionAtStart, userId: userMessage.id })
  const expectedTailIds = await resolveTruncateTail({
    sessionId: sessionAtStart,
    messages,
    anchorId: userMessage.id,
    mode: "after"
  })
  if (!expectedTailIds) {
    await refreshAfterTailMismatch(sessionAtStart)
    return
  }
  if (!stillIdle(sessionAtStart)) return
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
    const started = await startTurnWithTruncateRetry(store, runKind, userMessage.content, history, assetIds, {
      keepId: userMessage.id,
      expectedTailIds,
      before: messages,
      pending: nextMessages[nextMessages.length - 1]!
    })
    if (agentRunBlockedCode(started) || isBlockedStart(started)) return
    clearRetryTarget()
    await claimStartedRun(sessionId, Promise.resolve(started))
  } catch (err: unknown) {
    store.setError(err instanceof Error ? err.message : "Regeneration failed.")
    store.setRunning(false)
    await resyncAfterStartThrow(sessionId)
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

  const sessionAtStart = store.sessionId
  rememberRetryTarget({
    kind: "edit",
    sessionId: sessionAtStart,
    userId: oldUserMsg.id,
    content: newContent.trim()
  })
  const expectedTailIds = await resolveTruncateTail({
    sessionId: sessionAtStart,
    messages,
    anchorId: oldUserMsg.id,
    mode: "after"
  })
  if (!expectedTailIds) {
    await refreshAfterTailMismatch(sessionAtStart)
    return
  }
  if (!stillIdle(sessionAtStart)) return
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
    const started = await startTurnWithTruncateRetry(store, runKind, newContent.trim(), history, assetIds, {
      keepId: updatedUserMsg.id,
      expectedTailIds,
      before: messages,
      pending: nextMessages[nextMessages.length - 1]!,
      keepMessage: updatedUserMsg
    })
    if (agentRunBlockedCode(started) || isBlockedStart(started)) return
    clearRetryTarget()
    await claimStartedRun(sessionId, Promise.resolve(started))
  } catch (err: unknown) {
    store.setError(err instanceof Error ? err.message : "Execution failed.")
    store.setRunning(false)
    await resyncAfterStartThrow(sessionId)
  }
}

/** 读库对账期间别人起跑了或切了会话：放弃这次。 */
function stillIdle(sessionId: string): boolean {
  const live = useChatStore.getState()
  return !live.running && live.sessionId === sessionId
}

/** 视图尾巴与库对不上：刷新视图，提示「有新内容」，什么都不删。 */
async function refreshAfterTailMismatch(sessionId: string): Promise<void> {
  const live = useChatStore.getState()
  if (live.sessionId !== sessionId) return
  await loadSession(sessionId, live.sessionTitle ?? "")
  useChatStore.getState().setError(translateTruncateNotice(TRUNCATE_TAIL_CHANGED))
}

/**
 * leo soft 4：main 在截断已提交之后、挂 run 之前抛错（modelMessagesForStart 等）不回滚库。
 * renderer 不留乐观气泡：按库刷新，用户看到的就是真状态（保留点那句还在，可以再点重新生成）。
 */
async function resyncAfterStartThrow(sessionId: string | null): Promise<void> {
  const live = useChatStore.getState()
  if (!sessionId || live.sessionId !== sessionId) return
  const error = live.error
  try {
    await loadSession(sessionId, live.sessionTitle ?? "")
  } catch {
    return
  }
  if (error) useChatStore.getState().setError(error)
}

type ThreadMessages = ChatStore["messages"]
type TurnHistoryEntry = RetryHistoryEntry & { role: ThreadMessages[number]["role"] }

/**
 * 截断 + 起跑，STALE 时按 leo MF-A / MF-B 决定是否重试（见 truncate-retry.ts）：
 * 尾巴完全相同才重试；保留点那条带原请求内容（编辑重发的新内容）；其余失败撤回乐观截断并提示。
 */
async function startTurnWithTruncateRetry(
  store: ChatStore,
  runKind: ReturnType<typeof composerRunKind>,
  prompt: string,
  history: TurnHistoryEntry[],
  assetIds: string[],
  opts: {
    keepId: string
    expectedTailIds: string[]
    /** 乐观截断前的视图，失败时放回。 */
    before: ThreadMessages
    pending: ThreadMessages[number]
    /** 编辑重发：保留点要显示 / 发送的新内容。 */
    keepMessage?: ThreadMessages[number]
  }
) {
  const sessionId = store.sessionId
  return startWithTruncateRetry<unknown, TurnHistoryEntry>(
    {
      start: (nextHistory, nextTail) =>
        startTurnIpc(useChatStore.getState(), runKind, prompt, nextHistory, assetIds, opts.keepId, nextTail),
      blockedCode: (result) => agentRunBlockedCode(result),
      restoreView: async () => {
        const live = useChatStore.getState()
        live.setRunning(false)
        if (live.sessionId !== sessionId || !sessionId) return
        live.setMessages(opts.before)
        await loadSession(sessionId, live.sessionTitle ?? "")
      },
      readMessages: () =>
        useChatStore.getState().messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          reasoning: message.reasoning
        })),
      reapplyOptimistic: () => {
        const live = useChatStore.getState()
        const keepIndex = live.messages.findIndex((message) => message.id === opts.keepId)
        if (keepIndex < 0) return
        const keep = opts.keepMessage ?? live.messages[keepIndex]!
        live.setMessages([...live.messages.slice(0, keepIndex), keep, opts.pending])
        live.setRunning(true)
        live.setError(null)
      },
      notice: (code) => useChatStore.getState().setError(translateTruncateNotice(code))
    },
    { keepId: opts.keepId, expectedTailIds: opts.expectedTailIds, history }
  )
}

async function startTurnIpc(
  store: ChatStore,
  runKind: ReturnType<typeof composerRunKind>,
  prompt: string,
  history: TurnHistoryEntry[],
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
