/**
 * 空闲发送：占 running 槽、乐观气泡、再开 agent.run / 媒体生成。
 */
import { getIde } from "../../lib/ide"
import { isAcpComposerRuntime } from "../../lib/agent-runtime"
import { useChatStore } from "../../stores/chat-store"
import { codingAgentRunInput } from "../agent-run-payload"
import { takeComposerAssetDetails, type QueuedComposerAsset } from "../composer-assets"
import { composerRunKind } from "../composer-run-kind"
import { syncReviewGateOnComposerStart } from "../../components/ai-chat/review-gate/sync-review-gate"
import { abortOrphanedRun, claimComposerRun } from "../composer-run-control"
import { failComposerSend } from "./fail-composer-send"
import { applyOptimisticTitle, completeSessionTitle } from "../session-title"
import { guardComposerSend } from "./send-composer-guard"
import { agentRunBlockedCode, requireAgentRunId } from "@enjoy-agents/ipc-contract/chat-readiness"
import {
  classifyThreadError,
  NEED_MODEL,
  NEED_PROVIDER_KEY,
  NO_CHAT_ROUTE
} from "../../lib/usage/classify-thread-error.ts"
import { pendingAssistantStamp } from "../../lib/pending-assistant-stamp"
import { applySessionContextToOutgoing } from "../session-context-inject"
import { readComposerDomText } from "../composer-dom"
import { runWhenComposerIdle } from "./composer-idle-turn"
import { traceSend } from "../send-debug"
import { resolveSendPayload, type SendPayload } from "./resolve-send-payload"
import { claimComposerRunning, releaseComposerRunningIfOwner } from "./composer-running-owner"
import { armSendWatchdog, markSendLaunched, sendAttemptCancelled, type SendAttempt } from "./send-watchdog"
import { isNewSessionCreatePending } from "../new-session-create"
import {
  captureComposerSend,
  preparedSendSnapshot
} from "./composer-send-snapshot"
import { desktopBiasForRun } from "./desktop-bias-for-run"
import { lastSeenCurrentBranch, rememberSessionBranch } from "../../lib/session-cwd-branch"
import { bumpSessionHydrateGeneration } from "../session-hydrate-generation"
import {
  clearSentComposerText,
  composerNeedsSessionReady,
  restoreComposerAfterFailedSend,
  restoreComposerDraft,
  PREVIOUS_STILL_PREPARING,
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


/** 先 setRunning 占位，避免双击连发两轮。创建窗内先入队，禁止清输入空转。 */
export async function sendComposerMessage(
  prepared?: PreparedSend,
  typedAtEnter?: string,
  /** 排队首发：沿用 Enter 那一刻挂的看门狗句柄。 */
  queuedAttempt?: SendAttempt
) {
  let store = useChatStore.getState()
  // 这次发送的原文只取一次：Enter 那一刻的 DOM 全文（或按钮点下时现读 DOM），之后全链路只用它。
  // 只有程序化调用（重试先 setComposer 再发、DOM 还没渲染）且 DOM 为空时才看 store。
  const typed = prepared ? prepared.content : (typedAtEnter ?? (readComposerDomText() || store.composer))
  traceSend("send", {
    prepared: Boolean(prepared),
    queuedFirst: Boolean(prepared?.sessionId),
    running: store.running,
    sessionId: store.sessionId,
    createPending: composerNeedsSessionReady(),
    dom: readComposerDomText().length,
    typed: typed.length
  })
  if (store.running) {
    // 只有创建窗里排队的首发（带 sessionId）限时等 running 落下；其余调用方保持原样直接不发。
    if (!prepared?.sessionId) {
      // jojo ④：「正在准备…」时又一发（排队自动续发 / 程序化调用）撞上 running：禁止静默丢，
      // 原文（+附件）还回输入框并出提示，用户看得见、可以再发。
      traceSend("send:running-restore")
      const text = prepared ? prepared.content : typed
      if (text.trim() || prepared?.assets?.length) {
        restoreComposerDraft(text, prepared?.assets)
        const busy = useChatStore.getState()
        // leo soft：上一条还在「正在准备…」→ 说清是在等上一条，不是发送失败。
        busy.setError(busy.preparingHint ? PREVIOUS_STILL_PREPARING : SEND_FAILED_RESTORE)
      }
      return
    }
    if (sendAttemptCancelled(queuedAttempt)) return
    const idle = await runWhenComposerIdle(
      {
        isRunning: () => useChatStore.getState().running,
        subscribe: (listener) => useChatStore.subscribe(listener)
      },
      QUEUED_SEND_IDLE_WAIT_MS,
      // 醒来同步占位，同一次通知叫醒的另一条排队发送会重查到 running 继续等。
      () => useChatStore.getState().setRunning(true)
    )
    if (!idle) {
      failComposerSend({
        text: prepared.content,
        reason: SEND_FAILED_RESTORE,
        sessionId: useChatStore.getState().sessionId,
        createdSessionId: prepared.sessionId,
        assets: prepared.assets,
        keepRunning: true
      })
      return
    }
    store = useChatStore.getState()
  }
  // leo soft：running 直接丢弃的那一发不挂看门狗（否则 3s 后误报「发送失败」）。
  const attempt = queuedAttempt ?? (!prepared && typed.trim() ? armComposerWatchdog(typed) : undefined)
  if (!prepared && store.composer !== typed) store.setComposer(typed)
  if (prepared?.sessionId && store.sessionId !== prepared.sessionId) {
    restoreComposerAfterFailedSend(prepared.content, SEND_FAILED_RESTORE, prepared.assets)
    return
  }
  if (composerNeedsSessionReady() && !prepared) {
    const text = typed
    if (!text.trim()) {
      restoreComposerAfterFailedSend(text, SESSION_NOT_READY)
      return
    }
    const assets = takeComposerAssetDetails()
    traceSend("send:queued", { text: text.length })
    await waitThenSendAfterCreate(text, (next) => sendComposerMessage(next, undefined, attempt), assets)
    return
  }
  const firstTurn = !store.messages.some((item) => item.role === "user")
  if (firstTurn) store.setPreparingHint(true)
  // running 归属：迟到作废时只放掉自己占的。
  const runningToken: object = attempt ?? {}
  claimComposerRunning(runningToken)
  if (!guardComposerSend(store)) {
    const blocked = useChatStore.getState().error
    traceSend("send:gate", { blocked })
    if (prepared) {
      failComposerSend({
        text: prepared.content,
        reason: blocked || SEND_FAILED_RESTORE,
        sessionId: store.sessionId,
        createdSessionId: prepared.sessionId,
        assets: prepared.assets
      })
      store.setPreparingHint(false)
      return
    }
    restoreDraftAfterSendGate(store, prepared)
    return
  }
  syncReviewGateOnComposerStart(store.sessionId)
  // 取稿前拍快照：失败时还原文 + 引用 / 技能 / 知识 Chip + 附件，不还拼好的 content。
  const snapshot = prepared
    ? preparedSendSnapshot(prepared.content, prepared.assets)
    : captureComposerSend(typed)
  let optimisticContent: string | undefined
  try {
    const payload = await resolveSendPayload(prepared, snapshot, attempt)
    if (payload === "cancelled" || sendAttemptCancelled(attempt)) {
      // 看门狗已出提示并还稿：迟到的这一发作废，不能提示和发送同时发生。
      traceSend("send:watchdog-late")
      dropLateCancelledSend(store, runningToken)
      return
    }
    traceSend("send:payload", { content: payload?.content.length ?? -1, typed: payload?.typed.length ?? -1 })
    if (!payload) {
      // leo #145：空稿也可能来自已作废的 A——别清 B 的 running。
      if (sendAttemptCancelled(attempt)) return dropLateCancelledSend(store, runningToken)
      store.setRunning(false)
      store.setPreparingHint(false)
      return
    }
    const messages = beginOptimisticTurn(store, payload)
    optimisticContent = payload.content
    clearSentComposerText(payload.typed)
    await launchComposerRun(store, payload, messages, prepared?.sessionId, attempt)
  } catch (error) {
    traceSend("send:throw", { error: error instanceof Error ? error.name : typeof error })
    // leo #145：A 已被看门狗作废后才抛——看门狗已还过稿，不再还 A 的字、不清 B 的 running。
    if (sendAttemptCancelled(attempt)) return dropLateCancelledSend(store, runningToken)
    store.setPreparingHint(false)
    failComposerSend({
      text: snapshot.text,
      reason: SEND_FAILED_RESTORE,
      sessionId: useChatStore.getState().sessionId,
      createdSessionId: prepared?.sessionId,
      assets: snapshot.assets,
      chips: snapshot,
      dropOptimisticUser: optimisticContent !== undefined,
      optimisticContent
    })
  }
}

/** 迟到作废：只放自己占的 running / 准备提示；后一发已接手就别动。 */
function dropLateCancelledSend(store: ChatState, runningToken: object): void {
  if (releaseComposerRunningIfOwner(runningToken)) store.setPreparingHint(false)
}

const QUEUED_SEND_IDLE_WAIT_MS = 5_000

function armComposerWatchdog(typed: string): SendAttempt {
  const before = useChatStore.getState()
  return armSendWatchdog(typed, {
    // 只认这次 Enter 之后新冒出来的提示，Enter 前就挂着的旧条不算。
    noticeShown: () => {
      const state = useChatStore.getState()
      return Boolean((state.error && state.error !== before.error) || (state.notice && state.notice !== before.notice))
    },
    createPending: () => isNewSessionCreatePending(),
    otherRunActive: () => Boolean(useChatStore.getState().runId),
    fail: (text) => {
      traceSend("send:watchdog")
      const state = useChatStore.getState()
      state.setPreparingHint(false)
      restoreComposerAfterFailedSend(text, SEND_FAILED_RESTORE)
    }
  })
}

/** 闸拦发送：还全文草稿，中性条 error 不改写成失败 toast。 */
function restoreDraftAfterSendGate(store: ChatState, prepared?: PreparedSend): void {
  store.setRunning(false)
  store.setPreparingHint(false)
  const blocked = useChatStore.getState().error
  const draft = prepared?.content || readComposerDomText() || store.composer
  if (draft) restoreComposerDraft(draft, prepared?.assets)
  if (blocked === NO_CHAT_ROUTE || blocked === NEED_MODEL) return
  if (prepared?.content) store.setError(SEND_FAILED_RESTORE)
  else if (!store.sessionId) store.setError(SESSION_NOT_READY)
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
  messages: ChatState["messages"],
  createdSessionId?: string,
  attempt?: SendAttempt
) {
  const sessionId = store.sessionId
  markSendLaunched(attempt)
  traceSend("send:launch")
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
      failComposerSend({
        ...restoreFromPayload(payload),
        reason: blocked,
        sessionId,
        createdSessionId,
        dropOptimisticUser: true
      })
      return
    }
    const runId = requireAgentRunId(result)
    if (!claimComposerRun(sessionId, runId)) {
      abortOrphanedRun(runId)
      failComposerSend({
        ...restoreFromPayload(payload),
        reason: SEND_FAILED_RESTORE,
        sessionId,
        createdSessionId
      })
      return
    }
    rememberSessionBranch(sessionId ?? undefined, lastSeenCurrentBranch())
    void completeSessionTitle(payload.content)
  } catch (error) {
    failComposerSend({
      ...restoreFromPayload(payload),
      reason: composerSendError(error),
      sessionId: store.sessionId,
      createdSessionId,
      dropOptimisticUser: true
    })
  } finally {
    useChatStore.getState().setPreparingHint(false)
  }
}

/** main 回 {ok:false} 或抛错：还用户原文 + Chip + 附件；乐观气泡按拼好的 content 找。 */
function restoreFromPayload(payload: SendPayload) {
  return {
    text: payload.snapshot.text,
    assets: payload.snapshot.assets,
    chips: payload.snapshot,
    optimisticContent: payload.content
  }
}

function composerSendError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const kind = classifyThreadError(raw || SEND_FAILED_RESTORE)
  if (kind === "no_chat_route") return NO_CHAT_ROUTE
  if (kind === "needs_model") return NEED_MODEL
  if (kind === "needs_key") return NEED_PROVIDER_KEY
  return raw || SEND_FAILED_RESTORE
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

