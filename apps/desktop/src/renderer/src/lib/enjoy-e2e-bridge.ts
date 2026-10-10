/**
 * 窗口 E2E / 截图桥：只挂已有单例，不新开 IPC。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { resumeSetupGuide, replaySetupGuide, useSetupGuideStore } from "@renderer/components/setup-guide/setup-guide-store"
import { useCreateProjectStore } from "@renderer/components/workspace/create-project-open"
import { rememberChatReadiness } from "@renderer/hooks/chat-readiness-cache"
import { bindSessionRuntime } from "@renderer/hooks/persist-runtime"
import { CHAT_READINESS_QUERY_KEY } from "@renderer/hooks/use-chat-readiness"
import { forceSecretWriteForE2e, type SecretWriteErrorCode } from "@renderer/lib/secret-write"
import { queryClient } from "@renderer/lib/query-client"
import { useCrashProbeStore } from "@renderer/components/layout/crash-fallback/crash-probe"
import { useChatStore } from "@renderer/stores/chat-store"
import { useSourceFileReveal } from "@renderer/components/ai-chat/thread/sources/source-file-reveal"
import type { TurnSourceChip } from "@renderer/components/ai-chat/thread/sources/source-chip"
import { useSourcesSheetStore } from "@renderer/stores/sources-sheet/sources-sheet-store"

export type EnjoyE2eBridge = {
  setChatReadiness: (snap: ChatReadiness) => void
  getChatReadiness: () => ChatReadiness | undefined
  setError: (message: string | null) => void
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
    rightPanelCollapsed: boolean
  }
  injectSheetChip: (chip: TurnSourceChip) => void
  injectThisTurnWrite: (path: string) => void
}

declare global {
  interface Window {
    __enjoyE2e?: EnjoyE2eBridge
  }
}

export function installEnjoyE2eBridge(): void {
  if (typeof window === "undefined") return
  window.__enjoyE2e = {
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
      return {
        path: chat.selectedFilePath,
        line: reveal?.line ?? null,
        view: reveal?.view ?? null,
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
    }
  }
}
