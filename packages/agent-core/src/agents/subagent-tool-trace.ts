/**
 * 给子 Agent 工具包一层追踪：执行时上报 start/result，挂到父 delegate。
 */

import { withCommandDisplay } from "../tools/command-display.ts"

export type SubagentToolTraceEvent = {
  type: "tool.start" | "tool.result"
  toolCallId: string
  name: string
  parentToolCallId: string
  args?: unknown
  result?: unknown
  error?: string
}

export type SubagentToolTrace = {
  parentToolCallId: string
  emit: (event: SubagentToolTraceEvent) => void
}

type ToolBag = Record<string, { execute?: (...args: never[]) => unknown }>

/** 不改工具语义，只在 execute 前后发事件。 */
export function traceSubagentTools<T>(tools: T, trace: SubagentToolTrace): T {
  const source = tools as ToolBag
  const next: ToolBag = { ...source }
  for (const name of Object.keys(source)) {
    const spec = source[name]
    if (!spec || typeof spec.execute !== "function") continue
    const execute = spec.execute.bind(spec) as (
      args: unknown,
      options?: { toolCallId?: string }
    ) => unknown
    next[name] = {
      ...spec,
      execute: ((args: unknown, options?: { toolCallId?: string }) =>
        runTraced(name, execute, args, options, trace)) as typeof spec.execute
    }
  }
  return next as T
}

async function runTraced(
  name: string,
  execute: (args: unknown, options?: { toolCallId?: string }) => unknown,
  args: unknown,
  options: { toolCallId?: string } | undefined,
  trace: SubagentToolTrace
): Promise<unknown> {
  const toolCallId = options?.toolCallId?.trim() || `${trace.parentToolCallId}:${name}`
  trace.emit({
    type: "tool.start",
    toolCallId,
    name,
    parentToolCallId: trace.parentToolCallId,
    args
  })
  try {
    const result = await execute(args, options)
    trace.emit({
      type: "tool.result",
      toolCallId,
      name,
      parentToolCallId: trace.parentToolCallId,
      args,
      result: withCommandDisplay(result, toolCallId)
    })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    trace.emit({
      type: "tool.result",
      toolCallId,
      name,
      parentToolCallId: trace.parentToolCallId,
      args,
      error: message
    })
    throw error
  }
}
