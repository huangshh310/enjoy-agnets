/**
 * 空闲发送：占 running 槽、乐观气泡、再开 agent.run / 媒体生成。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import { getIde } from "../../lib/ide"
import { isAcpComposerRuntime } from "../../lib/agent-runtime"
import { useChatStore } from "../../stores/chat-store"
import { codingAgentRunInput } from "../agent-run-payload"
import { takeComposerAssetDetails, type QueuedComposerAsset } from "../composer-assets"
import { composerRunKind } from "../composer-run-kind"
import { syncReviewGateOnComposerStart } from "../../components/ai-chat/review-gate/sync-review-gate"
import {
  abortOrphanedRun,
  claimComposerRun,
  dropEmptyPendingAssistant
} from "../composer-run-control"
import { applyOptimisticTitle, completeSessionTitle } from "../session-title"
import { guardComposerSend } from "./send-composer-guard"
import { agentRunBlockedCode, requireAgentRunId } from "@enjoy-agents/ipc-contract/chat-readiness"
import { NEED_MODEL, NO_CHAT_ROUTE } from "../../lib/usage/classify-thread-error.ts"
import { pendingAssistantStamp } from "../../lib/pending-assistant-stamp"
import { applySessionContextToOutgoing } from "../session-context-inject"
import {
  clearComposerDraft,
  flushComposerDomToStore,
  prefixHostModeForSend,
  takeComposerText
} from "./composer-draft"
import { readComposerDomText } from "../composer-dom"
import { takeComputerUseSlash } from "@enjoy-agents/ipc-contract"
import { desktopBiasForRun } from "./desktop-bias-for-run"
import { lastSeenCurrentBranch, rememberSessionBranch } from "../../lib/session-cwd-branch"
import { bumpSessionHydrateGeneration } from "../session-hydrate-generation"
import {
  clearSentComposerText,
  composerNeedsSessionReady,
  mergeComposerText,
  restoreComposerAfterFailedSend,
  restoreComposerDraft,
  SEND_FAILED_RESTORE,
  SESSION_NOT_READY,
  waitThenSendAfterCreate
} from "../queue-composer-send"

type ChatState = ReturnType<typeof useChatStore.getState>
type PreparedSend = {
  content: string
  assets?: QueuedComposerAsset[]
  executePlan?: boolean
  sessionId?: string
}

type SendPayload = {
  content: string
  assetIds: string[]
  messageAssets: Array<{ assetId: string; mediaType: string; name: string; url?: string }>
  executePlan?: boolean
  /** 句首 /computer-use。只作用于这一发，不把总开关写成开。 */
  computerUseOnce?: boolean
}

/** 先 setRunning 占位，避免双击连发两轮。创建窗内先入队，禁止清输入空转。 */
export async function sendComposerMessage(prepared?: PreparedSend) {
  const store = useChatStore.getState()
  if (store.running) return
  if (!prepared) flushComposerDomToStore()
  if (prepared?.sessionId && store.sessionId !== prepared.sessionId) {
    restoreComposerAfterFailedSend(prepared.content, SEND_FAILED_RESTORE, prepared.assets)
    return
  }
  if (composerNeedsSessionReady() && !prepared) {
    const text = readComposerDomText()
    if (!text.trim()) {
      restoreComposerAfterFailedSend(text, SESSION_NOT_READY)
      return
    }
    const assets = takeComposerAssetDetails()
    await waitThenSendAfterCreate(text, (next) => sendComposerMessage(next), assets)
    return
  }
  const firstTurn = !store.messages.some((item) => item.role === "user")
  if (firstTurn) store.setPreparingHint(true)
  store.setRunning(true)
  if (!guardComposerSend(store)) {
    restoreDraftAfterSendGate(store, prepared)
    return
  }
  syncReviewGateOnComposerStart(store.sessionId)
  try {
    const payload = await resolveSendPayload(prepared)
    if (!payload) {
      store.setRunning(false)
      store.setPreparingHint(false)
      return
    }
    const messages = beginOptimisticTurn(store, payload)
    clearSentComposerText(payload.content)
    await launchComposerRun(store, payload, messages)
  } catch (error) {
    store.setRunning(false)
    store.setPreparingHint(false)
    store.setError(error instanceof Error ? error.message : String(error) || SEND_FAILED_RESTORE)
    if (prepared?.content) {
      restoreComposerAfterFailedSend(prepared.content, SEND_FAILED_RESTORE, prepared.assets)
    }
  }
}

/** 闸拦发送：还全文草稿，中性条 error 不改写成失败 toast。 */
function restoreDraftAfterSendGate(store: ChatState, prepared?: PreparedSend): void {
  store.setRunning(false)
  store.setPreparingHint(false)
  const blocked = useChatStore.getState().error
  const draft = prepared?.content ?? readComposerDomText() || store.composer
  if (draft) restoreComposerDraft(draft, prepared?.assets)
  if (blocked === NO_CHAT_ROUTE || blocked === NEED_MODEL) return
  if (prepared?.content) store.setError(SEND_FAILED_RESTORE)
  else if (!store.sessionId) store.setError(SESSION_NOT_READY)
}

async function resolveSendPayload(prepared?: PreparedSend): Promise<SendPayload | null> {
  const fromDraft = !prepared
  const raw = prepared?.content ?? (await takeComposerText())
  if (!raw.trim()) return null
  const slash = takeComputerUseSlash(raw)
  const body = slash.once ? slash.text || raw.trim() : raw
  const content = prefixHostModeForSend(body)
  if (fromDraft) clearComposerDraft()
  const queuedAssets = prepared?.assets ?? takeComposerAssetDetails()
  return {
    content,
    assetIds: queuedAssets.map((item) => item.id),
    messageAssets: queuedAssets.map((item) => ({
      assetId: item.id,
      mediaType: resolveMediaType(item.name, item.mediaType),
      name: item.name,
      url: item.url
    })),
    executePlan: prepared?.executePlan,
    computerUseOnce: slash.once || undefined
  }
}

function beginOptimisticTurn(store: ChatState, payload: SendPayload) {
  const messages = store.appendUserMessage(
    payload.content,
    payload.messageAssets.length > 0 ? payload.messageAssets : undefined
  )
  applyOptimisticTitle(payload.content)
  const runKind = isAcpComposerRuntime(store.runtimeId)
    ? "agent"
    : composerRunKind(store.modelId, currentCaps(store))
  store.setMessages([
    ...messages,
    {
      id: `msg_pending_${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
      reasoning: "",
      tools: [],
      runKind,
      ...pendingAssistantStamp(store)
    }
  ])
  // 作废仍在 await 的 loadSession，避免空库回灌把首发气泡洗成欢迎页。
  bumpSessionHydrateGeneration()
  return messages
}

async function launchComposerRun(
  store: ChatState,
  payload: SendPayload,
  messages: ChatState["messages"]
) {
  const sessionId = store.sessionId
  try {
    const result = await startComposerRun(
      store,
      payload.content,
      messages,
      payload.assetIds,
      payload.executePlan,
      payload.computerUseOnce
    )
    const blocked = agentRunBlockedCode(result)
    if (blocked) {
      dropEmptyPendingAssistant()
      store.setRunning(false)
      store.setError(blocked)
      if (payload.content) store.setComposer(mergeComposerText(payload.content, store.composer))
      return
    }
    const runId = requireAgentRunId(result)
    if (!claimComposerRun(sessionId, runId)) {
      abortOrphanedRun(runId)
      return
    }
    rememberSessionBranch(sessionId ?? undefined, lastSeenCurrentBranch())
    void completeSessionTitle(payload.content)
  } catch (error) {
    dropEmptyPendingAssistant()
    store.setRunning(false)
    store.setError(error instanceof Error ? error.message : String(error) || SEND_FAILED_RESTORE)
    if (payload.content) store.setComposer(mergeComposerText(payload.content, store.composer))
  } finally {
    useChatStore.getState().setPreparingHint(false)
  }
}

function currentCaps(store: ChatState) {
  return store.models.find((model) => model.id === store.modelId)?.capabilities
}

async function startComposerRun(
  store: ChatState,
  content: string,
  messages: ChatState["messages"],
  assetIds: string[],
  executePlan?: boolean,
  computerUseOnce?: boolean
) {
  const kind = isAcpComposerRuntime(store.runtimeId)
    ? "agent"
    : composerRunKind(store.modelId, currentCaps(store))
  const sessionNode = store.repositories.find((r) => r.id === store.sessionId)
  const history = messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    reasoning: message.reasoning
  }))
  const outgoingMessages = applySessionContextToOutgoing(
    isAcpComposerRuntime(store.runtimeId),
    { goal: sessionNode?.goal, recap: sessionNode?.recap },
    history
  )

  if (kind === "image" || kind === "video") {
    return getIde().ai.generate({
      kind,
      sessionId: store.sessionId,
      workspaceId: store.workspaceId ?? undefined,
      modelId: store.modelId,
      prompt: content,
      messages: outgoingMessages,
      attachments: assetIds
    })
  }
  const desktopBias = await desktopBiasForRun(content)
  const base = codingAgentRunInput(store)
  const once = computerUseOnce === true && !isAcpComposerRuntime(store.runtimeId)
  return getIde().agent.run({
    ...base,
    mode: once ? "agent" : base.mode,
    messages: outgoingMessages,
    attachments: assetIds,
    executePlan: executePlan || undefined,
    commandId: crypto.randomUUID(),
    ...(desktopBias ? { desktopBias } : {}),
    ...(once ? { computerUseOnce: true } : {})
  })
}

