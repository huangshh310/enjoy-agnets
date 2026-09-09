/**
 * Composer 切引擎 pending / 已交接微条。摘要只经 IPC 进隐藏上下文。
 */
import { create } from "zustand"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { persistRuntimeId } from "@renderer/hooks/persist-runtime"
import { abortComposerRun } from "@renderer/hooks/composer-run-control"
import { getIde, hasIde } from "@renderer/lib/ide"
import { isAgentToolId } from "../agent-brand-icon"
import { draftHandoffParts, formatHandoffHidden } from "./draft-handoff-summary"
import { planComposerSwitch, sessionHasUserTurns } from "./plan-composer-switch"
import type { EngineHandoffState } from "./plan-composer-switch.types"
import { useChatStore } from "@renderer/stores/chat-store"
import { restoreComposerEngineSelection } from "./restore-composer-engine"
import { HANDOFF_CONFIRM_FAILED } from "@renderer/lib/usage/classify-thread-error"

const idle: EngineHandoffState = {
  phase: "idle",
  fromRuntimeId: null,
  toRuntimeId: null,
  draftSummary: "",
  filePaths: [],
  banner: null
}

export const useEngineHandoffStore = create<
  EngineHandoffState & {
    setDraftSummary: (draftSummary: string) => void
    dismissBanner: () => void
    resetPending: () => void
  }
>((set) => ({
  ...idle,
  setDraftSummary: (draftSummary) => set({ draftSummary }),
  dismissBanner: () => set({ banner: null }),
  resetPending: () =>
    set({
      phase: "idle",
      fromRuntimeId: null,
      toRuntimeId: null,
      modelId: undefined,
      draftSummary: "",
      filePaths: []
    })
}))

export type RequestEngineSwitchResult = "applied" | "pending" | "blocked" | "noop"

/** Rail / Picker 选 to。未 ready 的调用方不要进来。 */
export async function requestEngineSwitch(to: string, modelId?: string): Promise<RequestEngineSwitchResult> {
  if (!isAgentToolId(to)) return "noop"
  const chat = useChatStore.getState()
  const plan = planComposerSwitch({
    from: chat.runtimeId,
    to,
    hasUserTurns: sessionHasUserTurns(chat.messages),
    hasPendingApproval: Boolean(chat.pendingApproval)
  })
  if (plan.kind === "noop") {
    if (modelId && to === chat.runtimeId) await persistRuntimeId(to, modelId)
    return "noop"
  }
  if (plan.kind === "apply") {
    await persistRuntimeId(to, modelId)
    useEngineHandoffStore.getState().resetPending()
    return "applied"
  }
  const draft = draftHandoffParts({
    messages: chat.messages,
    pendingApprovalName: chat.pendingApproval?.name
  })
  useEngineHandoffStore.setState({
    phase: plan.kind === "blocked_by_approval" ? "blocked_by_approval" : "handoff_pending",
    fromRuntimeId: plan.from,
    toRuntimeId: plan.to,
    modelId,
    draftSummary: draft.summary,
    filePaths: draft.files,
    banner: null
  })
  return plan.kind === "blocked_by_approval" ? "blocked" : "pending"
}

export async function confirmEngineHandoff(): Promise<boolean> {
  const state = useEngineHandoffStore.getState()
  const sessionId = useChatStore.getState().sessionId
  if (state.phase === "blocked_by_approval") return false
  if (state.phase !== "handoff_pending" || !state.fromRuntimeId || !state.toRuntimeId || !sessionId) {
    return false
  }
  if (!isAgentToolId(state.toRuntimeId) || !isAgentToolId(state.fromRuntimeId)) return false
  useEngineHandoffStore.setState({ phase: "disposing" })
  try {
    await abortComposerRun()
    if (hasIde()) {
      await getIde().agentTools.disposeSession({ sessionId })
      await getIde().agentTools.setHandoff({
        sessionId,
        fromRuntimeId: state.fromRuntimeId as AgentToolId,
        toRuntimeId: state.toRuntimeId as AgentToolId,
        summary: formatHandoffHidden(state.draftSummary, state.filePaths) || "上一引擎会话已结束。"
      })
    }
    await persistRuntimeId(state.toRuntimeId, state.modelId)
    useEngineHandoffStore.setState({
      phase: "idle",
      fromRuntimeId: null,
      toRuntimeId: null,
      modelId: undefined,
      draftSummary: "",
      filePaths: [],
      banner: {
        sessionId,
        fromRuntimeId: state.fromRuntimeId,
        toRuntimeId: state.toRuntimeId
      }
    })
    return true
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    useChatStore.getState().setError(raw.includes("HANDOFF") ? raw : HANDOFF_CONFIRM_FAILED)
    useEngineHandoffStore.setState({ phase: "handoff_pending" })
    return false
  }
}

/** 取消交接：清 pending，并把 chat.runtimeId 拉回 from。 */
export function cancelEngineHandoff(): string | null {
  const from = useEngineHandoffStore.getState().fromRuntimeId
  useEngineHandoffStore.setState({
    phase: "idle",
    fromRuntimeId: null,
    toRuntimeId: null,
    modelId: undefined,
    draftSummary: "",
    filePaths: [],
    banner: null
  })
  restoreComposerEngineSelection(from, useChatStore.getState().setRuntimeId)
  return from
}
