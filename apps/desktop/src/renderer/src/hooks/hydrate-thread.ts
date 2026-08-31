/**
 * 从会话行恢复 ThreadMessage：优先 assistant-payload，parts 补来源/资产。
 */
import {
  parseAssistantPayload,
  safeValidateUIMessages,
  sealAbandonedTools
} from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "../stores/chat-store"
import { extrasFromParts } from "./extras-from-parts.ts"

export type SessionMessageRow = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
  parts?: unknown[]
}

export function threadFromRows(rows: SessionMessageRow[]): ThreadMessage[] {
  return rows.map((row) => {
    if (row.role !== "assistant") {
      const extras = extrasFromParts(Array.isArray(row.parts) ? row.parts : [])
      return {
        id: row.id,
        role: row.role,
        content: row.content,
        createdAt: row.createdAt,
        assets: extras.assets.length > 0 ? extras.assets : undefined
      }
    }
    const payload = parseAssistantPayload(row.content)
    const validated = safeValidateUIMessages([
      { id: row.id, role: "assistant", parts: Array.isArray(row.parts) ? row.parts : [] }
    ])
    const extras = extrasFromParts(validated[0]?.parts)
    return {
      id: row.id,
      role: row.role,
      content: payload.content,
      reasoning: payload.reasoning,
      tools: sealAbandonedTools(payload.tools),
      thoughtSeconds: payload.thoughtSeconds,
      createdAt: row.createdAt,
      sources: payload.sources?.length ? payload.sources : extras.sources,
      assets: payload.assets?.length ? payload.assets : extras.assets,
      structured: payload.structured ?? extras.structured,
      components: extras.components
    }
  })
}
