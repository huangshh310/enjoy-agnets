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
import { useChatStore } from "@renderer/stores/chat-store"

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
    forceSecretWrite: forceSecretWriteForE2e
  }
}
