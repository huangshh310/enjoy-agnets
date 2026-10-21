/**
 * 所有 agent.event 先归 Attention，再决定写前台线程还是停车。
 */
import { noteFollowupRunEvent } from "../../hooks/followup-pause"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../chat-store"
import { isLateEventOfStoppedRun } from "../stopped-runs"
import { bumpsSessionTime, touchSessionUpdatedAt, type BumpProbe } from "../touch-session-time"
import { generationKindOf, isNonAgentRunKind } from "../stream-run-scope"
import { belongsToForeground } from "./foreground-event"
import { eventRunId } from "./ingest-attention"
import { useAttentionStore } from "./attention-store"
import { useAcpCommands } from "../acp-commands"
import { useHostInjectStore } from "../host-inject/host-inject-store"
import { patchSessionTitle } from "@renderer/hooks/session-title"
import { shouldRefineSessionTitle } from "@renderer/lib/session-title"
import { visibleUserText } from "@renderer/lib/user-message-text"
import { getIde, hasIde } from "@renderer/lib/ide"
import { lastTurnDeniedOnly } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { omitCompleteFromTurn } from "@renderer/components/ai-chat/review-gate/turn-from-event"
import { syncReviewGateAfterEvent } from "@renderer/components/ai-chat/review-gate/sync-review-gate"
import { clearSessionUsage, rememberSessionUsage } from "../session-usage"
import { noteTurnSettled } from "../turn-settled"
import { noteBackgroundPreOutputRollback } from "../after-pre-output-rollback"
import { noteBackgroundRunError } from "@renderer/lib/session-draft-storage"

export { belongsToForeground } from "./foreground-event"

export function dispatchAgentEvent(event: StreamEvent): void {
  // #160 巡检 6：用户停掉的那一轮迟到的审批 / 出字，不进 Attention、不停车、不进前台（终态照常放行）。
  if (isLateEventOfStoppedRun(event)) return
  const sessionId = resolveEventSessionId(event)
  const runId = eventRunId(event)
  const eventKind = generationKindOf(event)
  if (sessionId && runId) useAttentionStore.getState().rememberRun(runId, sessionId, eventKind)
  const rememberedKind = runId ? useAttentionStore.getState().kindOfRun(runId) : undefined
  const storeEarly = useChatStore.getState()
  const foreground = belongsToForeground(
    event,
    storeEarly.sessionId,
    storeEarly.runId,
    storeEarly.running,
    sessionId,
    rememberedKind
  )
  if (sessionId && !isNonAgentRunKind(event, rememberedKind)) {
    const meta = sessionMetaOf(sessionId)
    useAttentionStore.getState().ingest(event, sessionId, meta.title, meta.workspaceId, {
      omitComplete: omitCompleteFromTurn(
        event,
        foreground && event.type === "run.end" && lastTurnDeniedOnly(storeEarly.messages)
      ),
      foreground
    })
  }

  // E1：出错 / 停止先停住这个会话的排队，再让 store / 停车放 running=false（自启看不到空档）。
  noteFollowupRunEvent(sessionId, event, isNonAgentRunKind(event, rememberedKind))
  if (sessionId && event.type === "run.start") clearSessionUsage(sessionId)
  // #160 巡检 5：发出 / 一轮结束时侧栏时间跟着走（前台、后台会话都算）。
  if (sessionId && bumpsSessionTime(event as BumpProbe) && !isNonAgentRunKind(event, rememberedKind)) {
    touchSessionUpdatedAt(sessionId)
  }
  if (event.type === "usage.updated" && sessionId) {
    const chat = useChatStore.getState()
    rememberSessionUsage(sessionId, event, sessionId === chat.sessionId ? chat.runtimeId : undefined)
  }
  if (event.type === "commands.update") {
    useAcpCommands.getState().setCommands(event.commands)
  }
  if (event.type === "session.config") {
    const current = useChatStore.getState()
    if (!sessionId || sessionId === current.sessionId) current.applyStreamEvent(event)
  }
  if (event.type === "session.title") {
    applyAgentSessionTitle(event.title, sessionId)
  }
  if (event.type === "host.inject" && sessionId) {
    useHostInjectStore.getState().remember(sessionId, {
      runId: event.runId,
      runtimeId: event.runtimeId,
      mcp: event.mcp,
      skills: event.skills
    })
  }

  const store = useChatStore.getState()
  if (foreground) {
    store.applyStreamEvent(event)
    syncReviewGateAfterEvent(event, sessionId, true)
    return
  }
  if (sessionId) useAttentionStore.getState().applyParkEvent(sessionId, event)
  // leo r3 M2：后台这一轮站住（出字 / run.end）同样让首句自动标题落定。
  // 标题精炼（completion）也走这条停车分支：它的 run.end 不算首句站住，否则回滚时标题撤不回。
  const nonAgentRun = isNonAgentRunKind(event, rememberedKind)
  noteTurnSettled(sessionId, event, nonAgentRun)
  // leo r3 M4：后台出字前回滚——main 已把稿和图写回草稿，renderer 缓存 / 内存草稿重读合并。
  if (!nonAgentRun && noteBackgroundRunError(sessionId, event)) noteBackgroundPreOutputRollback(sessionId, runId)
  syncReviewGateAfterEvent(event, sessionId, false)
}

export function resolveEventSessionId(event: StreamEvent): string | undefined {
  if (event.sessionId) return event.sessionId
  const runId = eventRunId(event)
  const mapped = useAttentionStore.getState().sessionOfRun(runId)
  if (mapped) return mapped
  const store = useChatStore.getState()
  if (runId && store.runId === runId && store.sessionId) return store.sessionId
  return undefined
}

function applyAgentSessionTitle(title: string, sessionId?: string): void {
  const store = useChatStore.getState()
  const targetId = sessionId ?? store.sessionId
  if (!targetId) return
  const next = title.trim().slice(0, 80)
  if (!next) return
  const node = store.repositories.find((item) => item.id === targetId)
  const current = node?.name ?? (store.sessionId === targetId ? store.sessionTitle : "")
  const lastUser =
    store.sessionId === targetId
      ? [...store.messages].reverse().find((row) => row.role === "user")?.content
      : undefined
  const userText = lastUser ? visibleUserText(lastUser) : ""
  if (!shouldRefineSessionTitle(current, userText)) return
  patchSessionTitle(targetId, next)
  if (!hasIde()) return
  void getIde().session.rename({ sessionId: targetId, title: next }).catch(() => undefined)
}

function sessionMetaOf(sessionId: string): { title: string; workspaceId?: string } {
  const store = useChatStore.getState()
  const node = store.repositories.find((item) => item.id === sessionId)
  const current = store.sessionId === sessionId
  return {
    title: node?.name ?? (current ? store.sessionTitle : sessionId),
    workspaceId: node?.workspaceId ?? node?.parentId ?? (current ? store.workspaceId ?? undefined : undefined)
  }
}
