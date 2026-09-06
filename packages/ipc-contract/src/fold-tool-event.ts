/**
 * 把流事件折进工具列表：主进程持久化与渲染进程 store 共用。
 */
import type { StreamEvent } from "./index"
import type { ThreadToolCall } from "./assistant-payload"

export function foldToolEvent(tools: ThreadToolCall[], event: StreamEvent): void {
  if (event.type === "tool.start") {
    const current = tools.find((tool) => tool.id === event.toolCallId)
    const hasArgs = event.args !== undefined || current?.args !== undefined || Boolean(current?.argsText)
    upsertTool(tools, {
      id: event.toolCallId,
      name: event.name,
      ...(event.args !== undefined ? { args: mergeToolArgs(current?.args, event.args) } : {}),
      state: hasArgs ? "input-available" : "input-streaming"
    })
    return
  }
  if (event.type === "tool.args.delta") {
    const current = tools.find((tool) => tool.id === event.toolCallId)
    upsertTool(tools, {
      id: event.toolCallId,
      argsText: `${current?.argsText ?? ""}${event.delta}`,
      state: "input-streaming"
    })
    return
  }
  if (event.type === "tool.result") {
    upsertTool(tools, {
      id: event.toolCallId,
      name: event.name,
      ...(event.args !== undefined ? { args: event.args } : {}),
      result: event.result,
      errorText: event.error,
      state: event.error ? "output-error" : "output-available"
    })
    return
  }
  if (event.type === "approval.required") {
    upsertTool(tools, {
      id: event.toolCallId,
      name: event.name,
      args: event.args,
      state: "approval-requested"
    })
    return
  }
  if (event.type === "approval.resolved") {
    upsertTool(tools, {
      id: event.toolCallId,
      state: event.decision === "deny" ? "output-denied" : "input-available"
    })
  }
}

/** 加载历史时：只收口卡死的 Pending，保留审批中与已完成。 */
export function sealAbandonedTools(tools: ThreadToolCall[] | undefined): ThreadToolCall[] | undefined {
  if (!tools) return tools
  return tools.map((tool) =>
    tool.state === "input-streaming"
      ? { ...tool, state: "output-error" as const, errorText: tool.errorText ?? "No result received." }
      : tool
  )
}

function mergeToolArgs(prev: unknown, next: unknown): unknown {
  if (!isArgsRecord(prev) || !isArgsRecord(next)) return next
  const merged = { ...prev, ...next }
  const prevPath = typeof prev.path === "string" ? prev.path : ""
  const nextPath = typeof next.path === "string" ? next.path : ""
  if (isGenericPath(nextPath) && !isGenericPath(prevPath)) merged.path = prevPath
  return merged
}

function isArgsRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isGenericPath(value: string): boolean {
  return !value.trim() || /^(file|folder|directory|command|path)$/i.test(value.trim())
}

function upsertTool(tools: ThreadToolCall[], patch: Partial<ThreadToolCall> & { id: string }) {
  const index = tools.findIndex((tool) => tool.id === patch.id)
  if (index >= 0) {
    const current = tools[index]
    if (!current) return
    tools[index] = { ...current, ...patch, name: patch.name ?? current.name }
    return
  }
  tools.push({
    id: patch.id,
    name: patch.name ?? "tool",
    state: patch.state ?? "input-streaming",
    argsText: patch.argsText,
    args: patch.args,
    result: patch.result,
    errorText: patch.errorText
  })
}
