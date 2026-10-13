/**
 * 助手消息重新生成 (Regenerate) 与用户消息编辑重发 (Edit & Resend) 核心调度模块。
 * 遵循 Vercel AI SDK 7 的消息上下文裁剪与多轮调度规范。
 */
import { shouldRetryAsTodoContinue } from "../components/ai-chat/composer/todo-continue-message"
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
import type { RetryTarget } from "./regenerate-retry-target"
import { resolveTruncateTail } from "./resolve-truncate-tail"
import { translateTruncateNotice } from "./truncate-notice"
import { isBlockedStart, startWithTruncateRetry, type RetryHistoryEntry } from "./truncate-retry"

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
  await regenerateFromUserIndex(store, userIndex)
}

/**
 * jojo P2：失败轮没有助手回复时，红卡「重新生成」从这条用户句重跑——
 * 走截断（保留该用户句、id 不变，main 按 id 原地更新），绝不另发一条新的用户句。
 */
/** 返回是否真的起跑了（false = 静默没动，调用方要自己兜底）。 */
export async function regenerateUserTurn(userMessageId: string): Promise<boolean> {
  const store = useChatStore.getState()
  if (store.running || !hasIde()) return false
  if (!store.workspaceId || !store.sessionId) return false
  const userIndex = store.messages.findIndex((m) => m.id === userMessageId && m.role === "user")
  if (userIndex === -1) return false
  return regenerateFromUserIndex(store, userIndex)
}

async function regenerateFromUserIndex(store: ChatStore, userIndex: number): Promise<boolean> {
  const messages = store.messages
  if (!store.sessionId) return false
  const userMessage = messages[userIndex]
  if (!userMessage) return false

  // luna：失败 / 空的助手轮若前面是用户真话，重发原话（下面的常规截断重跑），不走续跑合成提示。
  if (shouldRetryAsTodoContinue(userMessage)) {
    await continueTodoTurn()
    return true
  }

  // 截断至该用户消息（保留到 user 消息，丢弃后续旧回复）。
  // jojo P1 / leo #147 MF-1：名单只用权威 id：回灌的库 id、message.persisted 绑的 persistedId、或按 runId 严格绑上的库行；绑不上的占位气泡不进名单。
  const sessionAtStart = store.sessionId
  const expectedTailIds = await resolveTruncateTail({
    sessionId: sessionAtStart,
    messages,
    anchorId: userMessage.id,
    mode: "after"
  })
  if (!stillIdle(sessionAtStart)) return false
  const retryTarget: RetryTarget = { kind: "regenerate", sessionId: sessionAtStart, userId: userMessage.id }
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
      pending: nextMessages[nextMessages.length - 1]!,
      retryTarget
    })
    if (agentRunBlockedCode(started) || isBlockedStart(started)) return true
    await claimStartedRun(sessionId, Promise.resolve(started))
  } catch (err: unknown) {
    store.setError(err instanceof Error ? err.message : "Regeneration failed.")
    store.setRunning(false)
    await resyncAfterStartThrow(sessionId)
  }
  return true
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
  const expectedTailIds = await resolveTruncateTail({
    sessionId: sessionAtStart,
    messages,
    anchorId: oldUserMsg.id,
    mode: "after"
  })
  if (!stillIdle(sessionAtStart)) return
  const retryTarget: RetryTarget = {
    kind: "edit",
    sessionId: sessionAtStart,
    userId: oldUserMsg.id,
    content: newContent.trim()
  }
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
      keepMessage: updatedUserMsg,
      retryTarget
    })
    if (agentRunBlockedCode(started) || isBlockedStart(started)) return
    await claimStartedRun(sessionId, Promise.resolve(started))
  } catch (err: unknown) {
    store.setError(err instanceof Error ? err.message : "Execution failed.")
    store.setRunning(false)
    await resyncAfterStartThrow(sessionId)
  }
}

/** 读库期间别人起跑了或切了会话：放弃这次。 */
function stillIdle(sessionId: string): boolean {
  const live = useChatStore.getState()
  return !live.running && live.sessionId === sessionId
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
    await reloadSession(sessionId, live.sessionTitle ?? "")
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
    /** 被闸挡下时挂在红卡上的重试目标（leo #147 MF-2）。 */
    retryTarget: RetryTarget
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
        await reloadSession(sessionId, live.sessionTitle ?? "")
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
      notice: (code) => useChatStore.getState().setError(translateTruncateNotice(code), opts.retryTarget)
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

/** 会话生命周期模块很重（拖进整套 UI store）：只在需要回灌时再加载。 */
async function reloadSession(sessionId: string, title: string): Promise<void> {
  const { loadSession } = await import("./session-lifecycle")
  await loadSession(sessionId, title)
}

/**
 * jojo P2 / leo：没有助手回复的失败轮——按原用户句 id 重跑，不经输入框另发（会多一条用户行）。
 * 真起跑才收红卡（regenerate 起跑时自己清）；没起跑：红卡留着，原话放回输入框，不自动发。
 */
export async function retryFailedUserTurn(lastUser: { id?: string; content: string }): Promise<boolean> {
  const started = lastUser.id ? await regenerateUserTurn(lastUser.id) : false
  if (started) return true
  const store = useChatStore.getState()
  if (!store.composer.trim()) store.setComposer(lastUser.content)
  return false
}
