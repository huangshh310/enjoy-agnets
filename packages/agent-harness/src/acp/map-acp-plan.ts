/**
 * ACP session/update plan → 现有 todo_write 工具事件，进 Composer Todo Dock。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

const PLAN_KINDS = new Set(["plan", "plan_update"])
const ACP_PLAN_TOOL = "todo_write"
const ACP_PLAN_CALL_ID = "acp-plan"

export function isAcpPlanUpdate(kind: string): boolean {
  return PLAN_KINDS.has(kind)
}

export function mapAcpPlan(rec: Record<string, unknown>, runId: string): StreamEvent[] {
  const todos = planTodos(rec)
  if (todos.length === 0) return []
  const args = { todos }
  return [
    { type: "tool.start", runId, toolCallId: ACP_PLAN_CALL_ID, name: ACP_PLAN_TOOL, args },
    { type: "tool.result", runId, toolCallId: ACP_PLAN_CALL_ID, name: ACP_PLAN_TOOL, args, result: args }
  ]
}

function planTodos(rec: Record<string, unknown>): Array<{ id: string; title: string; status: string }> {
  const raw = rec.entries ?? rec.todos ?? rec.items
  if (!Array.isArray(raw)) return []
  const todos: Array<{ id: string; title: string; status: string }> = []
  for (let index = 0; index < raw.length; index += 1) {
    const row = asRecord(raw[index])
    const title = String(row.content ?? row.title ?? row.text ?? "").trim()
    if (!title) continue
    todos.push({
      id: String(row.id ?? `plan_${index + 1}`),
      title,
      status: planStatus(row.status)
    })
  }
  return todos
}

function planStatus(value: unknown): string {
  const status = String(value ?? "").toLowerCase()
  if (status === "completed" || status === "done") return "completed"
  if (status === "in_progress" || status === "in-progress" || status === "started") return "in_progress"
  return "pending"
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
