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
import type { ThreadMessage } from "@renderer/stores/chat-store.types"
import { useSourceFileReveal } from "@renderer/components/ai-chat/thread/sources/source-file-reveal"
import type { TurnSourceChip } from "@renderer/components/ai-chat/thread/sources/source-chip"
import { useSourcesSheetStore } from "@renderer/stores/sources-sheet/sources-sheet-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import { addQuotedContext } from "@renderer/hooks/quoted-context"
import { forceArchivePrompt } from "@renderer/hooks/deny-then-archive"
import type { SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"
import { setThreadFindOpen } from "@renderer/components/ai-chat/thread/thread-find/thread-find-store"
import { revealSidebarSession as revealSidebarSessionVirtua } from "@renderer/lib/session-list-virtua-scroll"

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
  /** P2 list-virtua 自门：灌入足够长的 turn 列表（不经 IPC）。 */
  seedLongThread?: (count?: number) => { total: number }
  /** P2 sessionlist-virtua 自门：灌入多会话超出侧栏一屏。 */
  seedManySessions?: (count?: number) => { total: number; grouping: string }
  /** 切侧栏分组：flat / project / status。 */
  setSidebarGrouping?: (grouping: "project" | "flat" | "status") => void
  /** 标当前会话 running，逼出钉住组。 */
  setRunningForPin?: (running: boolean) => void
  /** sessionId→virtua scrollToIndex + 短高亮。 */
  revealSidebarSession?: (sessionId: string) => boolean
  /** 直接选中会话（树高亮 / 跳转自门）。 */
  selectSessionById?: (sessionId: string) => void
  /** P2 list-virtua 自门：注入一条待批（Dock 外置验收）。 */
  injectPendingApproval?: () => void
  clearPendingApproval?: () => void
  openThreadFind?: () => void
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
    seedLongThread(count = 40) {
      const store = useChatStore.getState()
      const n = Math.max(4, Math.min(120, Math.floor(count)))
      const now = Date.now()
      const messages: ThreadMessage[] = []
      for (let i = 0; i < n; i += 1) {
        const createdAt = now - (n - i) * 60_000
        if (i % 2 === 0) {
          messages.push({
            id: `e2e-virtua-u-${i}`,
            role: "user" as const,
            content: `长线程用户句 #${i} · 找条锚点 VIRTUA_FIND_${i}_END · ${"正文 ".repeat(12)}`,
            createdAt
          })
        } else {
          messages.push({
            id: `e2e-virtua-a-${i}`,
            role: "assistant" as const,
            content: `长线程助手句 #${i} · 工具行示意\n\n${"段落内容。".repeat(8)}`,
            createdAt,
            tools:
              i % 6 === 1
                ? [
                    {
                      id: `e2e-tool-${i}`,
                      name: "read_file",
                      state: "output-available" as const,
                      args: { path: `src/demo-${i}.ts` }
                    }
                  ]
                : undefined
          })
        }
      }
      store.setMessages(messages)
      if (store.sessionId) markSessionHistoryHydrated(store.sessionId)
      return { total: messages.length }
    },
    seedManySessions(count = 40) {
      const store = useChatStore.getState()
      const n = Math.max(12, Math.min(80, Math.floor(count)))
      const workspace = store.repositories.find((node) => node.kind === "workspace")
      if (!workspace) return { total: 0, grouping: store.sidebarGrouping }
      const now = Date.now()
      const currentId = store.sessionId
      const sessions = [] as Array<{
        id: string
        title: string
        updatedAt: number
        workspaceId: string
        workflowStatus?: SessionWorkflowStatus
      }>
      for (let i = 0; i < n; i += 1) {
        const id = i === 0 && currentId ? currentId : `e2e-sess-virtua-${i}`
        sessions.push({
          id,
          title: `多会话侧栏 #${i}`,
          updatedAt: now - i * 45_000,
          workspaceId: workspace.id,
          workflowStatus: i === 1 ? ("in_progress" as SessionWorkflowStatus) : undefined
        })
      }
      store.hydrateSessions(
        { id: workspace.id, name: workspace.name },
        sessions
      )
      store.setSidebarGrouping("flat")
      return { total: sessions.length, grouping: "flat" }
    },
    setSidebarGrouping(grouping) {
      useChatStore.getState().setSidebarGrouping(grouping)
    },
    setRunningForPin(running) {
      useChatStore.getState().setRunning(running)
    },
    revealSidebarSession(sessionId) {
      return revealSidebarSessionVirtua(sessionId)
    },
    selectSessionById(sessionId) {
      const store = useChatStore.getState()
      const node = store.repositories.find((n) => n.kind === "session" && n.id === sessionId)
      store.setSession(sessionId, node?.name ?? sessionId)
    },
    injectPendingApproval() {
      const store = useChatStore.getState()
      const event = {
        type: "approval.required" as const,
        runId: "e2e-virtua-run",
        sessionId: store.sessionId ?? "e2e-session",
        approvalId: "e2e-virtua-approval",
        toolCallId: "e2e-virtua-tc",
        name: "bash",
        args: { command: "echo p2-list-virtua-dock" }
      }
      store.setPendingApproval(event as never)
    },
    clearPendingApproval() {
      useChatStore.getState().setPendingApproval(null)
    },
    openThreadFind() {
      setThreadFindOpen(true)
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
