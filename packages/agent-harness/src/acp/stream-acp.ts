/**
 * 本机 ACP 一轮：按 Enjoy sessionId 复用进程，审批不新开子进程。
 */
import type { ModelMessage } from "ai"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { AcpClient } from "./client.ts"
import { mapAcpUpdate } from "./map-events.ts"
import { spawnAcpProcess } from "./spawn.ts"
import type { SpawnOverride } from "../agent-tools/resolve-spawn.ts"

export type AcpTurnHandle = {
  stream: AsyncIterable<Record<string, unknown>>
  result: unknown
  dispose: () => Promise<void>
}

export type StreamAcpTurnInput = {
  runId: string
  sessionId: string
  toolId: string
  workspaceRoot: string
  messages: ModelMessage[]
  abortSignal?: AbortSignal
  override?: SpawnOverride
  env?: Record<string, string>
  waitForApproval?: (input: {
    toolName: string
    toolCallId: string
    input: unknown
  }) => Promise<"allow" | "deny" | "allow_session">
}

type LiveAcp = {
  client: AcpClient
  acpSessionId: string
  enjoySessionId: string
  runId: string
  modelKey: string
  onUpdate?: (update: unknown) => void
  waitForApproval?: StreamAcpTurnInput["waitForApproval"]
}

const liveBySession = new Map<string, LiveAcp>()
const sessionByRun = new Map<string, string>()
const inflightBySession = new Map<string, Promise<LiveAcp>>()

export async function streamAcpTurn(input: StreamAcpTurnInput): Promise<AcpTurnHandle> {
  const live = await ensureLive(input)
  live.runId = input.runId
  live.waitForApproval = input.waitForApproval
  sessionByRun.set(input.runId, input.sessionId)
  const text = lastUserText(input.messages)
  const queue: StreamEvent[] = []
  let wake: (() => void) | undefined
  let finished = false

  live.onUpdate = (update) => {
    for (const event of mapAcpUpdate(update, input.runId)) queue.push(event)
    wake?.()
  }

  const prompt = live.client.prompt(live.acpSessionId, text).finally(() => {
    finished = true
    wake?.()
  })

  const onAbort = () => {
    void live.client.cancel(live.acpSessionId)
    finished = true
    wake?.()
  }
  input.abortSignal?.addEventListener("abort", onAbort, { once: true })

  const stream = (async function* () {
    try {
      while (!finished || queue.length > 0) {
        if (queue.length > 0) {
          yield queue.shift() as Record<string, unknown>
          continue
        }
        await new Promise<void>((resolve) => {
          wake = resolve
        })
      }
      await prompt
    } finally {
      input.abortSignal?.removeEventListener("abort", onAbort)
      live.onUpdate = undefined
    }
  })()

  return {
    stream,
    result: prompt,
    dispose: async () => {
      if (input.abortSignal?.aborted) await disposeAcpSession(input.sessionId)
    }
  }
}

export async function disposeAcpTurn(runId: string): Promise<void> {
  const sessionId = sessionByRun.get(runId)
  sessionByRun.delete(runId)
  if (sessionId) await disposeAcpSession(sessionId)
}

export async function disposeAcpSession(sessionId: string): Promise<void> {
  const live = liveBySession.get(sessionId)
  liveBySession.delete(sessionId)
  live?.client.dispose()
}

/** 退出应用时立刻杀掉全部 ACP 子进程，避免泄漏。 */
export function disposeAllAcpSessions(): void {
  for (const live of liveBySession.values()) live.client.dispose("kill")
  liveBySession.clear()
  sessionByRun.clear()
  inflightBySession.clear()
}

async function ensureLive(input: StreamAcpTurnInput): Promise<LiveAcp> {
  const modelKey = modelKeyFor(input)
  const existing = liveBySession.get(input.sessionId)
  if (existing && existing.modelKey === modelKey) return existing

  const pending = inflightBySession.get(input.sessionId)
  if (pending) {
    const live = await pending
    if (live.modelKey === modelKey && liveBySession.get(input.sessionId) === live) return live
  }

  const work = connectLive(input, modelKey)
  inflightBySession.set(input.sessionId, work)
  try {
    return await work
  } finally {
    if (inflightBySession.get(input.sessionId) === work) inflightBySession.delete(input.sessionId)
  }
}

async function connectLive(input: StreamAcpTurnInput, modelKey: string): Promise<LiveAcp> {
  const existing = liveBySession.get(input.sessionId)
  if (existing && existing.modelKey === modelKey) return existing
  if (existing) await disposeAcpSession(input.sessionId)

  const spawned = spawnAcpProcess({
    id: input.toolId,
    cwd: input.workspaceRoot,
    override: input.override,
    env: input.env
  })
  const live: LiveAcp = {
    client: new AcpClient(spawned.child, {
      onUpdate: (update) => live.onUpdate?.(update),
      onPermission: async (req) => {
        if (!live.waitForApproval) return "deny"
        return live.waitForApproval({
          toolName: req.name,
          toolCallId: req.toolCallId,
          input: req.args
        })
      }
    }),
    acpSessionId: "",
    enjoySessionId: input.sessionId,
    runId: input.runId,
    modelKey
  }
  try {
    live.acpSessionId = await live.client.handshake(input.workspaceRoot)
    liveBySession.set(input.sessionId, live)
    return live
  } catch (error) {
    live.client.dispose("kill")
    throw error
  }
}

function modelKeyFor(input: StreamAcpTurnInput): string {
  return `${input.override?.modelId?.trim() || ""}:${JSON.stringify(input.env || {})}`
}

function lastUserText(messages: ModelMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message || message.role !== "user") continue
    if (typeof message.content === "string") return message.content
    if (!Array.isArray(message.content)) continue
    const text = message.content
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? String(part.text) : ""))
      .join("\n")
    const hasFile = message.content.some((part) => part.type === "file" || part.type === "image")
    if (text.trim() && hasFile) {
      return `${text}\n[User also attached files. They are not forwarded over the ACP text prompt.]`
    }
    if (text.trim()) return text
    if (hasFile) return "[User attached files. They are not forwarded over the ACP text prompt.]"
  }
  return ""
}
