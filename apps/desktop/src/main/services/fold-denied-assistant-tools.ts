/**
 * 归档 / Stop 结清后把库里助手信封的审批中工具折成已停止（cancelled）或已拒绝（deny）。
 * 不解档时不得再弹出一张死卡。
 */
import { foldToolEvent, parseAssistantPayload, serializeAssistantPayload } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { persistMessage } from "./persist-session"

export function foldDeniedAssistantTool(input: {
  sessionId: string
  runId: string
  toolCallId: string
  decision?: "deny" | "cancelled"
  code?: string
}): boolean {
  const db = getDatabase()
  const rows = db
    .prepare(
      "SELECT id, content FROM messages WHERE session_id = ? AND role = 'assistant' ORDER BY created_at DESC"
    )
    .all(input.sessionId) as Array<{ id: string; content: string }>
  for (const row of rows) {
    const payload = parseAssistantPayload(row.content)
    const tools = payload.tools ?? []
    const tool = tools.find((item) => item.id === input.toolCallId)
    if (!tool || tool.state !== "approval-requested") continue
    foldToolEvent(tools, {
      type: "approval.resolved",
      runId: input.runId,
      toolCallId: input.toolCallId,
      decision: input.decision ?? "cancelled",
      ...(input.code ? { code: input.code } : {})
    })
    persistMessage(
      input.sessionId,
      "assistant",
      serializeAssistantPayload({ ...payload, tools }),
      undefined,
      row.id
    )
    return true
  }
  return false
}

export function sessionIdForRun(runId: string): string | undefined {
  const row = getDatabase()
    .prepare("SELECT session_id as sessionId FROM runs WHERE id = ?")
    .get(runId) as { sessionId?: string } | undefined
  return row?.sessionId
}
