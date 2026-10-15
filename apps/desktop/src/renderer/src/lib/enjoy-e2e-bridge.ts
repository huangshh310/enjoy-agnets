/**
 * 窗口 E2E / 截图桥：只挂已有单例，不新开 IPC。
 */
import { markSessionHistoryHydrated } from "@renderer/hooks/session-history-pending"
import type { AgentRunResult, ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { codingAgentRunInput } from "@renderer/hooks/agent-run-payload"
import { getIde, hasIde } from "@renderer/lib/ide"
import { resumeSetupGuide, replaySetupGuide, useSetupGuideStore } from "@renderer/components/setup-guide/setup-guide-store"
import { useCreateProjectStore } from "@renderer/components/workspace/create-project-open"
import { rememberChatReadiness } from "@renderer/hooks/chat-readiness-cache"
import { bindSessionRuntime } from "@renderer/hooks/persist-runtime"
import { CHAT_READINESS_QUERY_KEY } from "@renderer/hooks/use-chat-readiness"
import { forceSecretWriteForE2e, type SecretWriteErrorCode } from "@renderer/lib/secret-write"
import { CREDENTIAL_INVALID, PROVIDER_UNREACHABLE } from "@renderer/lib/send-gate-codes"
import { queryClient } from "@renderer/lib/query-client"
import { useCrashProbeStore } from "@renderer/components/layout/crash-fallback/crash-probe"
import { useChatStore } from "@renderer/stores/chat-store"
import { useSourceFileReveal } from "@renderer/components/ai-chat/thread/sources/source-file-reveal"
import type { TurnSourceChip } from "@renderer/components/ai-chat/thread/sources/source-chip"
import { useSourcesSheetStore } from "@renderer/stores/sources-sheet/sources-sheet-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import { addQuotedContext } from "@renderer/hooks/quoted-context"
import { forceArchivePrompt } from "@renderer/hooks/deny-then-archive"
import type { SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"

export type EnjoyE2eBridge = {
  setChatReadiness: (snap: ChatReadiness) => void
  getChatReadiness: () => ChatReadiness | undefined
  setError: (message: string | null) => void
  sendGateCodes: () => { credential_invalid: string; provider_unreachable: string }
  /** 本会话已选引擎但清空模型，模拟 NEED_MODEL；绑定后 defaultRoute 不得回填。 */
  clearSelectedModel: () => void
  getComposerGate: () => {
    sessionId: string | null
    runtimeId: string
    modelId: string
    error: string | null
    bound: boolean
  }
  replayGuide: () => void
  resumeGuide: () => void
  hideGuide: () => void
  hideCreateProject: () => void
  forceSecretWrite: (code: SecretWriteErrorCode | null) => void
  /** 故意触发根错误边界，用来拍「这里出了点问题。」回退面。 */
  crashRenderer: () => void
  getSelectedFile: () => {
    path: string | null
    line: number | null
    view: "diff" | "preview" | null
    paneKind: string | null
    rightPanelCollapsed: boolean
  }
  injectSheetChip: (chip: TurnSourceChip) => void
  injectThisTurnWrite: (path: string) => void
  addQuotedFileChip: (title?: string) => void
  openArchiveGuard: () => void
  setReviewChrome: (input: {
    title?: string
    workflowStatus?: SessionWorkflowStatus
    rightPanelCollapsed?: boolean
  }) => void
  /** 同会话同 id 打两次 agent.run，用来验 60s clientRequestId 去重。 */
  /** 只在 main 判过 e2e stub 闸（非打包 + 隔离 userData）时才有（leo soft #136）。 */
  runWithClientRequestId?: (text: string, clientRequestId: string) => Promise<AgentRunResult>
  /** Xvfb 窗常常没有真实 focus，直接上报当前会话。 */
  focusSession?: () => Promise<void>
}

declare global {
  interface Window {
    __enjoyE2e?: EnjoyE2eBridge
  }
}

/** 只组装桥对象，不写 window；挂载与 stub 过闸在 install-enjoy-e2e-bridge.ts。 */
export function createEnjoyE2eBridge(): EnjoyE2eBridge {
  const bridge: EnjoyE2eBridge = {
    setChatReadiness(snap) {
      rememberChatReadiness(snap)
      queryClient.setQueryData(CHAT_READINESS_QUERY_KEY, snap)
    },
    getChatReadiness() {
      return queryClient.getQueryData<ChatReadiness>(CHAT_READINESS_QUERY_KEY)
    },
    setError(message) {
      useChatStore.getState().setError(message)
    },
    sendGateCodes() {
      return {
        credential_invalid: CREDENTIAL_INVALID,
        provider_unreachable: PROVIDER_UNREACHABLE
      }
    },
    clearSelectedModel() {
      const store = useChatStore.getState()
      const sessionId = store.sessionId
      store.setModel("", "")
      if (sessionId) {
        store.setSessionModels({ ...store.sessionModels, [sessionId]: "" })
        void bindSessionRuntime(sessionId, store.runtimeId as never)
      }
    },
    getComposerGate() {
      const store = useChatStore.getState()
      const sessionId = store.sessionId
      return {
        sessionId,
        runtimeId: store.runtimeId,
        modelId: store.modelId,
        error: store.error,
        bound: Boolean(sessionId && store.sessionRuntimes[sessionId])
      }
    },
    replayGuide: replaySetupGuide,
    resumeGuide: resumeSetupGuide,
    hideGuide: () => useSetupGuideStore.getState().hide(),
    hideCreateProject: () => useCreateProjectStore.getState().hide(),
    forceSecretWrite: forceSecretWriteForE2e,
    crashRenderer: () => useCrashProbeStore.getState().arm(),
    getSelectedFile() {
      const chat = useChatStore.getState()
      const reveal = useSourceFileReveal.getState().reveal
      const pane = useRightPaneStore.getState()
      const tab = pane.tabs.find((item) => item.id === pane.activeId)
      return {
        path: chat.selectedFilePath,
        line: reveal?.line ?? null,
        view: reveal?.view ?? null,
        paneKind: tab?.kind ?? null,
        rightPanelCollapsed: chat.rightPanelCollapsed
      }
    },
    injectSheetChip(chip) {
      const sheet = useSourcesSheetStore.getState()
      sheet.openSheet({
        chips: [...sheet.chips, chip],
        activeId: sheet.activeId,
        ledgerEntry: sheet.ledgerEntry
      })
    },
    injectThisTurnWrite(path) {
      const store = useChatStore.getState()
      const messages = store.messages
      const last = messages.at(-1)
      if (!last || last.role !== "assistant") return
      store.setMessages([
        ...messages.slice(0, -1),
        {
          ...last,
          tools: [
            ...(last.tools ?? []),
            {
              id: `e2e-write-${path}`,
              name: "write_file",
              state: "output-available",
              args: { path }
            }
          ]
        }
      ])
    },
    addQuotedFileChip(title = "readme.md") {
      addQuotedContext({
        id: `e2e-quote-${title}`,
        type: "file",
        title,
        snippet: "e2e"
      })
    },
    openArchiveGuard() {
      const sessionId = useChatStore.getState().sessionId ?? "e2e-archive"
      forceArchivePrompt(sessionId)
    },
    setReviewChrome(input) {
      const store = useChatStore.getState()
      const existing = store.sessionId
      const fallback = store.repositories.find((node) => node.kind === "session")?.id
      const sessionId = existing ?? fallback ?? null
      if (sessionId && input.title) {
        store.setSession(sessionId, input.title)
        // e2e 桩只改页头，不回灌历史：保持原来的展示，不进「加载中」。
        markSessionHistoryHydrated(sessionId)
      }
      if (sessionId && input.workflowStatus) {
        store.patchSessionNode(sessionId, { workflowStatus: input.workflowStatus })
      }
      if (input.rightPanelCollapsed !== undefined) {
        store.setRightPanelCollapsed(input.rightPanelCollapsed)
      }
    },
    async focusSession() {
      const sessionId = useChatStore.getState().sessionId
      if (!sessionId || !hasIde()) return
      const setFocused = getIde().session.setFocused
      if (typeof setFocused !== "function") return
      await setFocused({ sessionId })
    },
    async runWithClientRequestId(text, clientRequestId) {
      if (!hasIde()) throw new Error("ide unavailable")
      const store = useChatStore.getState()
      const base = codingAgentRunInput(store)
      const sessionId = base.sessionId
      const workspaceId = base.workspaceId
      if (!sessionId || !workspaceId) throw new Error("session not ready")
      return getIde().agent.run({
        ...base,
        sessionId,
        workspaceId,
        messages: [{ role: "user", content: text }],
        commandId: crypto.randomUUID(),
        clientRequestId
      })
    }
  }
  return bridge
}
