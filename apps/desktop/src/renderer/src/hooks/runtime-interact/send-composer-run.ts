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
import {
  abortOrphanedRun,
  claimComposerRun,
  dropEmptyPendingAssistant
} from "../composer-run-control"
import { applyOptimisticTitle, completeSessionTitle } from "../session-title"
import { runModeForComposer, takeComposerSlash } from "../../components/ai-chat/composer/composer-mode"
import { guardComposerSend } from "./send-composer-guard"
import { clearComposerDraft, takeComposerText } from "./composer-draft"

type ChatState = ReturnType<typeof useChatStore.getState>
type PreparedSend = { content: string; assets?: QueuedComposerAsset[] }

type SendPayload = {
  content: string
  assetIds: string[]
  messageAssets: Array<{ assetId: string; mediaType: string; name: string; url?: string }>
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
  const payload = resolveSendPayload(prepared)
  if (!payload) {
    store.setRunning(false)
    return
  }
  const messages = beginOptimisticTurn(store, payload)
  await launchComposerRun(store, payload, messages)
}

function resolveSendPayload(prepared?: PreparedSend): SendPayload | null {
  const fromDraft = !prepared
  const raw = prepared?.content ?? takeComposerText()
  const parsed = takeComposerSlash(raw)
  if (parsed.mode && runModeForComposer(useChatStore.getState().runtimeId, parsed.mode) === parsed.mode) {
    useChatStore.getState().setMode(parsed.mode)
  }
  const content = parsed.text
  if (!content) return null
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
    }))
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
      runKind
    }
  ])
  return messages
}

async function launchComposerRun(
  store: ChatState,
  payload: SendPayload,
  messages: ChatState["messages"]
) {
  const sessionId = store.sessionId
  try {
    const result = (await startComposerRun(store, payload.content, messages, payload.assetIds)) as {
      runId: string
    }
    if (!claimComposerRun(sessionId, result.runId)) {
      abortOrphanedRun(result.runId)
      return
    }
    if (composerRunKind(store.modelId, currentCaps(store)) === "agent") {
      void completeSessionTitle(payload.content)
    }
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
  assetIds: string[]
) {
  const kind = isAcpComposerRuntime(store.runtimeId)
    ? "agent"
    : composerRunKind(store.modelId, currentCaps(store))
  const history = messages.map((message) => ({
    role: message.role,
    content: message.content,
    reasoning: message.reasoning
  }))
  if (kind === "image" || kind === "video") {
    return getIde().ai.generate({
      kind,
      sessionId: store.sessionId,
      workspaceId: store.workspaceId ?? undefined,
      modelId: store.modelId,
      prompt: content,
      messages: history,
      attachments: assetIds
    })
  }
  return getIde().agent.run({
    ...codingAgentRunInput(store),
    messages: history,
    attachments: assetIds
  })
}

