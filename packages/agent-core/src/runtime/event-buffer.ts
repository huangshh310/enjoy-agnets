/**
 * 运行时事件缓冲：供 AiRuntime.stream 与诊断回放共用。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { orderReplayEvents } from "../observability/replay.ts"
import type { RuntimeEvent } from "./types.ts"

export type EventBuffer = {
  push: (event: RuntimeEvent) => void
  list: (filter?: { sessionId?: string; runId?: string; limit?: number }) => RuntimeEvent[]
  stream: (runId: string) => AsyncGenerator<RuntimeEvent>
}

export function createEventBuffer(maxEvents = 400): EventBuffer {
  const events: RuntimeEvent[] = []
  const waiters = new Map<string, Set<(event: RuntimeEvent) => void>>()

  function push(event: RuntimeEvent) {
    events.push(event)
    if (events.length > maxEvents) events.shift()
    const runId = runIdOf(event)
    if (!runId) return
    waiters.get(runId)?.forEach((notify) => notify(event))
  }

  function list(filter: { sessionId?: string; runId?: string; limit?: number } = {}) {
    const matched = events.filter((event) => matchesFilter(event, filter))
    const ordered = orderReplayEvents(matched)
    return ordered.slice(-(filter.limit ?? 200))
  }

  async function* stream(runId: string): AsyncGenerator<RuntimeEvent> {
    for (const event of list({ runId })) {
      yield event
      if (isTerminal(event)) return
    }
    while (true) {
      const event = await waitNext(runId)
      yield event
      if (isTerminal(event)) return
    }
  }

  function waitNext(runId: string): Promise<RuntimeEvent> {
    return new Promise((resolve) => {
      let bucket = waiters.get(runId)
      if (!bucket) {
        bucket = new Set()
        waiters.set(runId, bucket)
      }
      const notify = (event: RuntimeEvent) => {
        bucket?.delete(notify)
        resolve(event)
      }
      bucket.add(notify)
    })
  }

  return { push, list, stream }
}

function runIdOf(event: StreamEvent): string | undefined {
  return "runId" in event ? event.runId : undefined
}

function matchesFilter(
  event: RuntimeEvent,
  filter: { sessionId?: string; runId?: string }
): boolean {
  if (filter.sessionId && event.sessionId !== filter.sessionId) return false
  if (filter.runId && runIdOf(event) !== filter.runId) return false
  return true
}

function isTerminal(event: RuntimeEvent): boolean {
  return event.type === "run.end" || event.type === "run.error"
}
