/**
 * 窗口 E2E / 截图桥：只挂已有单例，不新开 IPC。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { resumeSetupGuide, replaySetupGuide } from "@renderer/components/setup-guide/setup-guide-store"
import { rememberChatReadiness } from "@renderer/hooks/chat-readiness-cache"
import { CHAT_READINESS_QUERY_KEY } from "@renderer/hooks/use-chat-readiness"
import { queryClient } from "@renderer/lib/query-client"
import { useChatStore } from "@renderer/stores/chat-store"

export type EnjoyE2eBridge = {
  setChatReadiness: (snap: ChatReadiness) => void
  setError: (message: string | null) => void
  replayGuide: () => void
  resumeGuide: () => void
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
    setError(message) {
      useChatStore.getState().setError(message)
    },
    replayGuide: replaySetupGuide,
    resumeGuide: resumeSetupGuide
  }
}
