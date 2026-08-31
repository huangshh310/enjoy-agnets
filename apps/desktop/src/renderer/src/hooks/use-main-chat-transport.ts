/**
 * 桌面 MainChatTransport：renderer 只走 preload IPC，不直连 HTTP / 不读密钥。
 */
import { getIde } from "@renderer/lib/ide"

export function useMainChatTransport() {
  return {
    generate: (input: unknown) => getIde().ai.generate(input),
    abort: (runId: string) => getIde().ai.abort(runId),
    resume: (runId: string) => getIde().ai.resume(runId),
    onEvent: (callback: (event: unknown) => void) => getIde().agent.onEvent(callback)
  }
}
