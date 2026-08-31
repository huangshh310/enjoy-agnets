/**
 * useCompletion 语义：补全走 IPC，不直连 HTTP、不读密钥。
 */
import { useMainChatTransport } from "./use-main-chat-transport"

export function completePrompt(input: { sessionId: string; modelId: string; prompt: string }) {
  return useMainChatTransport().generate({ kind: "completion", ...input })
}

export function useCompletion() {
  const transport = useMainChatTransport()
  return {
    complete: (input: { sessionId: string; modelId: string; prompt: string }) =>
      transport.generate({ kind: "completion", ...input }),
    abort: transport.abort,
    onEvent: transport.onEvent
  }
}
