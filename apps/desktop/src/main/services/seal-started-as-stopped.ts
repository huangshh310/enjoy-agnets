/**
 * 停止封口补丁：审批放行后由 executeStoredTool 执行的工具，run.tools 里还停在 approval-requested
 * （approval.resolved 要等工具返回后才折叠）。sealAbandonedTools 会把它封成 decision=cancelled，
 * 下游 isToolNotExecuted 就把它当「未执行」：这一轮掉回待办、刷新后工具行也说没跑。
 * 账本里已经过闸（started / spawned / settled）的 toolCallId 改封成普通「已停止」（user_aborted，去掉 cancelled）。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { USER_ABORTED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"

export function sealStartedAsStopped(tools: ThreadToolCall[], started: ReadonlySet<string>): ThreadToolCall[] {
  if (started.size === 0) return tools
  return tools.map((tool) => {
    if (!started.has(tool.id) || tool.state !== "output-error") return tool
    const prev = tool.result && typeof tool.result === "object" ? (tool.result as Record<string, unknown>) : {}
    if (prev.decision !== "cancelled") return tool
    const { decision: _cancelled, ...rest } = prev
    return { ...tool, errorText: undefined, result: { ...rest, code: USER_ABORTED_CODE } }
  })
}
