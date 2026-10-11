/**
 * luna P2：「从这里重来」/ 重新生成截掉几轮后，待验收（needs_review）要按**剩下的**轮次重算，main 为准。
 *
 * needs_review 平时是粘性的（开跑 / 只读收工不擦，只等人通过或打回）。截断后：
 * - 剩下的助手轮里还有真写过盘的（decideTurnOutcome 判 needs_review）：保持不动（不知道哪轮审过，宁可多审）；
 * - 一轮都没有：被删掉的轮才是待验收来源，改回 todo，审查条随之消失。
 */
import { parseAssistantPayload } from "@enjoy-agents/ipc-contract/assistant-payload"
import { decideTurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import { getDatabase } from "./database"

export function remainingTurnsNeedReview(sessionId: string): boolean {
  const rows = getDatabase()
    .prepare("SELECT content FROM messages WHERE session_id = ? AND role = 'assistant'")
    .all(sessionId) as Array<{ content: string }>
  return rows.some((row) => {
    const tools = parseAssistantPayload(row.content).tools ?? []
    return decideTurnOutcome({ ended: "end", tools }).workflow === "needs_review"
  })
}

/** 截断提交之后调用。返回新的 workflow（没改返回 null）。 */
export function recomputeReviewAfterTruncate(sessionId: string): "todo" | null {
  const db = getDatabase()
  const row = db.prepare("SELECT workflow_status as workflowStatus FROM sessions WHERE id = ?").get(sessionId) as
    | { workflowStatus: string | null }
    | undefined
  if (row?.workflowStatus !== "needs_review") return null
  if (remainingTurnsNeedReview(sessionId)) return null
  // 故意绕过粘性：待验收的来源已经被删掉了。
  db.prepare("UPDATE sessions SET workflow_status = 'todo' WHERE id = ?").run(sessionId)
  return "todo"
}
