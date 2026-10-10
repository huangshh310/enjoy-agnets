/**
 * 把流事件折进工具列表：主进程持久化与渲染进程 store 共用。
 */
import type { StreamEvent } from "./index"
import type { ThreadToolCall } from "./assistant-payload"
import { isToolNotExecuted } from "./approval-not-executed.ts"
import { RESTART_ABANDONED_CODE, USER_ABORTED_CODE } from "./desktop-notify.ts"

export function foldToolEvent(tools: ThreadToolCall[], event: StreamEvent): void {
  if (event.type === "tool.start") {
    const current = tools.find((tool) => tool.id === event.toolCallId)
    const hasArgs = event.args !== undefined || current?.args !== undefined || Boolean(current?.argsText)
    upsertTool(tools, {
      id: event.toolCallId,
      name: event.name,
      ...(event.args !== undefined ? { args: mergeToolArgs(current?.args, event.args) } : {}),
      ...(event.parentToolCallId ? { parentToolCallId: event.parentToolCallId } : {}),
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

/** 加载历史 / 收工：input-streaming 与 input-available 封成 output-error。用户停标 stopped；重启放弃用 restart_abandoned。 */
export function sealAbandonedTools(
  tools: ThreadToolCall[] | undefined,
  opts?: { aborted?: boolean; code?: string }
): ThreadToolCall[] | undefined {
  if (!tools) return tools
  const sealCode = opts?.code ?? (opts?.aborted ? USER_ABORTED_CODE : undefined)
  return tools.map((tool) => {
    if (tool.state === "approval-requested") {
      const prev = tool.result && typeof tool.result === "object" ? (tool.result as Record<string, unknown>) : {}
      if (sealCode) {
        return {
          ...tool,
          state: "output-error" as const,
          result: { ...prev, code: sealCode, decision: "cancelled" }
        }
      }
      // 冷启动等待回挂：未决行保持 pending，禁止先封成红失败。
      return tool
    }
    if (sealCode && tool.state === "output-error") {
      return upgradeHydrateRedSeal(tool, sealCode)
    }
    if (tool.state !== "input-streaming" && tool.state !== "input-available") return tool
    if (sealCode) {
      const prev = tool.result && typeof tool.result === "object" ? (tool.result as Record<string, unknown>) : {}
      return {
        ...tool,
        state: "output-error" as const,
        errorText: undefined,
        result: {
          ...prev,
          code: sealCode,
          ...(sealCode === RESTART_ABANDONED_CODE ? { decision: "cancelled" } : {})
        }
      }
    }
    return { ...tool, state: "output-error" as const, errorText: tool.errorText ?? "No result received." }
  })
}

/** 冷启动曾封成红「No result received.」：回挂码来了要盖上去。已有码不改。 */
function upgradeHydrateRedSeal(tool: ThreadToolCall, sealCode: string): ThreadToolCall {
  const prev = tool.result && typeof tool.result === "object" ? (tool.result as Record<string, unknown>) : {}
  if (typeof prev.code === "string" && prev.code) return tool
  return {
    ...tool,
    errorText: undefined,
    result: {
      ...prev,
      code: sealCode,
      ...(sealCode === RESTART_ABANDONED_CODE ? { decision: "cancelled" } : {})
    }
  }
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
    parentToolCallId: patch.parentToolCallId
  })
}
