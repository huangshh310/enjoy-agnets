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
import { pendingAssistantStamp } from "../../lib/pending-assistant-stamp"
import { applySessionContextToOutgoing } from "../session-context-inject"
import { clearComposerDraft, prefixHostModeForSend, takeComposerText } from "./composer-draft"
import { takeComputerUseSlash } from "@enjoy-agents/ipc-contract"
import { desktopBiasForRun } from "./desktop-bias-for-run"
import { lastSeenCurrentBranch, rememberSessionBranch } from "../../lib/session-cwd-branch"
import { bumpSessionHydrateGeneration } from "../session-hydrate"

type ChatState = ReturnType<typeof useChatStore.getState>
type PreparedSend = { content: string; assets?: QueuedComposerAsset[]; executePlan?: boolean }

type SendPayload = {
  content: string
  assetIds: string[]
  messageAssets: Array<{ assetId: string; mediaType: string; name: string; url?: string }>
  executePlan?: boolean
  /** 句首 /computer-use。只作用于这一发，不把总开关写成开。 */
  computerUseOnce?: boolean
}

/** 先 setRunning 占位，避免双击连发两轮。 */
export async function sendComposerMessage(prepared?: PreparedSend) {
  const store = useChatStore.getState()
  if (store.running) return
  store.setRunning(true)
  if (!guardComposerSend(store)) {
    store.setRunning(false)
    return
  }
  syncReviewGateOnComposerStart(store.sessionId)
  const payload = await resolveSendPayload(prepared)
  if (!payload) {
    store.setRunning(false)
    return
  }
  const messages = beginOptimisticTurn(store, payload)
  await launchComposerRun(store, payload, messages)
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
    const result = (await startComposerRun(
      store,
      payload.content,
      messages,
      payload.assetIds,
      payload.executePlan,
      payload.computerUseOnce
    )) as {
      runId: string
    }
    if (!claimComposerRun(sessionId, result.runId)) {
      abortOrphanedRun(result.runId)
      return
    }
    rememberSessionBranch(sessionId ?? undefined, lastSeenCurrentBranch())
    void completeSessionTitle(payload.content)
  } catch (error) {
    dropEmptyPendingAssistant()
    store.setRunning(false)
    store.setError(error instanceof Error ? error.message : String(error))
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

