/**
 * main 侧的对话回滚能力守卫（#159 F1，leo soft 9）：renderer 的「从这里重来」入口已按引擎隐藏，
 * session.truncateFrom 在 main 再守一道，绕过界面直接调 IPC 也截不了 ACP 会话。
 */
import { supportsConversationRollback } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { getDatabase, getSetting } from "./database.ts"

/**
 * 这条会话能不能回滚对话（#159 F1，leo soft 9）：renderer 入口已按引擎隐藏，main 再守一道——
 * 会话绑的引擎（settings session.runtimes）不支持回滚，或会话挂着 ACP 绑定（acp_runtime_id），就拒。
 * 没绑过引擎的旧会话按 Enjoy 本地（默认）处理，放行。
 * session.runtimes 读不出来（坏 JSON / 不是对象 / 这条会话的值不是字符串）→ 拒（leo #167 ②：不知道绑了什么就按不安全处理）。
 */
export function sessionSupportsRollback(sessionId: string): boolean {
  const bound = readBoundRuntime(sessionId)
  if (bound.kind === "unreadable") return false
  if (bound.kind === "bound" && !supportsConversationRollback(bound.runtimeId)) return false
  const row = getDatabase().prepare("SELECT acp_runtime_id as acp FROM sessions WHERE id = ?").get(sessionId) as
    | { acp?: string | null }
    | undefined
  const acp = row?.acp?.trim()
  if (acp && !supportsConversationRollback(acp)) return false
  return true
}

type BoundRuntime = { kind: "none" } | { kind: "bound"; runtimeId: string } | { kind: "unreadable" }

function readBoundRuntime(sessionId: string): BoundRuntime {
  const raw = getSetting("session.runtimes")
  if (!raw) return { kind: "none" }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: "unreadable" }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { kind: "unreadable" }
  if (!Object.prototype.hasOwnProperty.call(parsed, sessionId)) return { kind: "none" }
  const value = (parsed as Record<string, unknown>)[sessionId]
  if (value === undefined || value === null) return { kind: "none" }
  if (typeof value !== "string") return { kind: "unreadable" }
  return value.trim() ? { kind: "bound", runtimeId: value.trim() } : { kind: "none" }
}
