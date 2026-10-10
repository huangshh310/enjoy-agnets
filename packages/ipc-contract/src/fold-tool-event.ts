/**
 * 把流事件折进工具列表：主进程持久化与渲染进程 store 共用。
 */
import type { StreamEvent } from "./index"
import type { ThreadToolCall } from "./assistant-payload"
import { isToolNotExecuted } from "./approval-not-executed.ts"
import { USER_ABORTED_CODE } from "./desktop-notify.ts"

export function foldToolEvent(tools: ThreadToolCall[], event: StreamEvent): void {
  if (event.type === "tool.start") {
    const current = tools.find((tool) => tool.id === event.toolCallId)
    const hasArgs = event.args !== undefined || current?.args !== undefined || Boolean(current?.argsText)
    upsertTool(tools, {
      id: event.toolCallId,
      name: event.name,
      ...(event.args !== undefined ? { args: mergeToolArgs(current?.args, event.args) } : {}),
      ...(event.parentToolCallId ? { parentToolCallId: event.parentToolCallId } : {}),
      ...sessionAllowPatch(event),
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
    const current = tools.find((tool) => tool.id === event.toolCallId)
    const result = mergeResultDecision(current?.result, event.result)
    const notExecuted = isToolNotExecuted({
      result,
      errorText: event.error
    })
    upsertTool(tools, {
      id: event.toolCallId,
      name: event.name,
      ...(event.args !== undefined ? { args: event.args } : {}),
      ...(event.parentToolCallId ? { parentToolCallId: event.parentToolCallId } : {}),
      ...sessionAllowPatch(event),
      result,
      errorText: event.error,
      state: notExecuted ? "output-denied" : event.error ? "output-error" : "output-available"
    })
    return
  }
  if (event.type === "approval.required") {
    upsertTool(tools, {
      id: event.toolCallId,
      name: event.name,
      args: event.args,
      ...sessionAllowPatch(event),
      state: "approval-requested"
    })
    return
  }
  if (event.type === "approval.resolved") {
    const current = tools.find((tool) => tool.id === event.toolCallId)
    const cancelled = event.decision === "cancelled"
    const code = event.code ?? (cancelled ? USER_ABORTED_CODE : undefined)
    upsertTool(tools, {
      id: event.toolCallId,
      state: cancelled ? "output-error" : event.decision === "deny" ? "output-denied" : "input-available",
      result: mergeResultDecision(current?.result, {
        decision: event.decision,
        ...(code ? { code } : {})
      })
    })
  }
}

/** 加载历史 / 收工：input-streaming 与 input-available 封成 output-error。用户停标 stopped。 */
export function sealAbandonedTools(
  tools: ThreadToolCall[] | undefined,
  opts?: { aborted?: boolean }
): ThreadToolCall[] | undefined {
  if (!tools) return tools
  return tools.map((tool) => {
    if (opts?.aborted && tool.state === "approval-requested") {
      const prev = tool.result && typeof tool.result === "object" ? (tool.result as Record<string, unknown>) : {}
      return {
        ...tool,
        state: "output-error" as const,
        result: { ...prev, code: USER_ABORTED_CODE, decision: "cancelled" }
      }
    }
    if (tool.state !== "input-streaming" && tool.state !== "input-available") return tool
    if (opts?.aborted) {
      const prev = tool.result && typeof tool.result === "object" ? (tool.result as Record<string, unknown>) : {}
      return {
        ...tool,
        state: "output-error" as const,
        errorText: undefined,
        result: { ...prev, code: USER_ABORTED_CODE }
      }
    }
    return { ...tool, state: "output-error" as const, errorText: tool.errorText ?? "No result received." }
  })
}

function mergeResultDecision(prev: unknown, next: unknown): unknown {
  const nextRecord = isArgsRecord(next) ? { ...next } : next !== undefined ? next : {}
  if (!isArgsRecord(nextRecord)) return nextRecord
  const prevDecision =
    isArgsRecord(prev) && typeof prev.decision === "string" ? prev.decision : undefined
  if (prevDecision && nextRecord.decision == null) nextRecord.decision = prevDecision
  return nextRecord
}

function mergeToolArgs(prev: unknown, next: unknown): unknown {
  if (!isArgsRecord(prev) || !isArgsRecord(next)) return next
  const merged = { ...prev, ...next }
  const prevPath = typeof prev.path === "string" ? prev.path : ""
  const nextPath = typeof next.path === "string" ? next.path : ""
  if (isGenericPath(nextPath) && !isGenericPath(prevPath)) merged.path = prevPath
  return merged
}

function sessionAllowPatch(event: {
  allowedBySession?: boolean
  sessionAllowScope?: ThreadToolCall["sessionAllowScope"]
  reaskReason?: "restart" | "restore"
}): Pick<ThreadToolCall, "allowedBySession" | "sessionAllowScope" | "reaskReason"> {
  return {
    ...(event.allowedBySession !== undefined ? { allowedBySession: event.allowedBySession } : {}),
    ...(event.sessionAllowScope ? { sessionAllowScope: event.sessionAllowScope } : {}),
    ...(event.reaskReason ? { reaskReason: event.reaskReason } : {})
  }
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
    errorText: patch.errorText,
    parentToolCallId: patch.parentToolCallId,
    allowedBySession: patch.allowedBySession,
    sessionAllowScope: patch.sessionAllowScope,
    reaskReason: patch.reaskReason
  })
}
