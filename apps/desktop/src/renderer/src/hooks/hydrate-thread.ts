/**
 * 从会话行恢复 ThreadMessage：优先 assistant-payload，parts 补来源/资产/工具。
 */
import { parseAssistantPayload, safeValidateUIMessages } from "@enjoy-agents/ipc-contract"
import { extrasFromParts } from "./extras-from-parts.ts"
import { hydrateAssistantTools } from "./hydrate-assistant-tools.ts"
import { mapAssistantThreadMessage, mapUserThreadMessage } from "./hydrate-thread-map.ts"
import { dedupeConsecutiveUserTurns } from "./dedupe-user-turns.ts"

export type SessionMessageRow = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
  parts?: unknown[]
}

export function threadFromRows(rows: SessionMessageRow[], opts?: { sealAbandoned?: boolean }) {
  const sealAbandoned = opts?.sealAbandoned !== false
  return dedupeConsecutiveUserTurns(rows).map((row) => {
    if (row.role !== "assistant") {
      return mapUserThreadMessage(row, extrasFromParts(Array.isArray(row.parts) ? row.parts : []))
    }
    const payload = parseAssistantPayload(row.content)
    const validated = safeValidateUIMessages([
      { id: row.id, role: "assistant", parts: Array.isArray(row.parts) ? row.parts : [] }
    ])
    const parts = Array.isArray(row.parts) ? row.parts : []
    return mapAssistantThreadMessage(
      row,
      payload,
      extrasFromParts(validated[0]?.parts),
      hydrateAssistantTools(payload.tools, parts, sealAbandoned)
    )
  })
}
