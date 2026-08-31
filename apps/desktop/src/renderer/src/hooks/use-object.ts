/**
 * useObject 语义：结构化对象/数组走 IPC，不直连 HTTP、不读密钥。
 */
import { useMainChatTransport } from "./use-main-chat-transport"

export type ObjectGenerateInput = {
  sessionId: string
  modelId: string
  prompt: string
  schemaJson?: unknown
  array?: boolean
}

export function generateObject(input: ObjectGenerateInput) {
  return useMainChatTransport().generate({
    kind: input.array ? "structured-array" : "structured-object",
    sessionId: input.sessionId,
    modelId: input.modelId,
    prompt: input.prompt,
    schemaJson: input.schemaJson
  })
}

export function useObject() {
  const transport = useMainChatTransport()
  return {
    generate: generateObject,
    abort: transport.abort,
    onEvent: transport.onEvent
  }
}
