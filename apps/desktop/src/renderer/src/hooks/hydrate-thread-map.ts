/**
 * 会话行 → ThreadMessage 的纯映射，不依赖 IPC barrel，方便 node 测试。
 */
import type { AssistantPayload } from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "../stores/chat-store"
import type { RestoredExtras } from "./extras-from-parts.ts"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"

export function mapUserThreadMessage(
  row: { id: string; content: string; createdAt: number },
  extras: RestoredExtras
): ThreadMessage {
  return {
    id: row.id,
    role: "user",
    content: row.content,
    createdAt: row.createdAt,
    assets: extras.assets.length > 0 ? extras.assets : undefined
  }
}

export function mapAssistantThreadMessage(
  row: { id: string; content: string; createdAt: number },
  payload: AssistantPayload,
  extras: RestoredExtras,
  tools: ThreadToolCall[] | undefined
): ThreadMessage {
  return {
    id: row.id,
    role: "assistant",
    content: payload.content,
    reasoning: payload.reasoning,
    tools,
    thoughtSeconds: payload.thoughtSeconds,
    createdAt: row.createdAt,
    sources: payload.sources?.length ? payload.sources : extras.sources,
    assets: payload.assets?.length ? payload.assets : extras.assets,
    structured: payload.structured ?? extras.structured,
    components: extras.components,
    runKind: payload.runKind
  }
}
