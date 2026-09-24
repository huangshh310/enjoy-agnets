/**
 * 本机 ACP 一轮：按 Enjoy sessionId 复用进程，审批不新开子进程。
 */
import type { ModelMessage } from "ai"
import { thoughtLevelOption, type SessionConfigOption, type StreamEvent } from "@enjoy-agents/ipc-contract"
import { AcpClient } from "./client.ts"
import { acpProcessKey, composeAcpPrompt } from "./acp-prompt.ts"
import { mapAcpUpdate } from "./map-events.ts"
import { sessionConfigEvent } from "./parse-session-config.ts"
import { acpHandshakeCwd, mapAcpSpawnFailure, spawnAcpProcess, type AcpSpawnDirect } from "./spawn.ts"
import type { SpawnOverride } from "../agent-tools/resolve-spawn.ts"
import { acpMcpFingerprint, type AcpMcpServer } from "./acp-mcp.ts"

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
  spawnDirect?: AcpSpawnDirect
  waitForApproval?: (input: {
    toolName: string
    toolCallId: string
    input: unknown
  }) => Promise<"allow" | "deny" | "allow_session">
  customInstructions?: string
  mcpServers?: AcpMcpServer[]
  skillCatalog?: string
  pluginDirs?: string[]
  /** ACP thought_level 原值；session/new 之后 set_config_option。 */
  thoughtLevel?: string
  /** 落库的 ACP sessionId；握手时优先 resume。 */
  resumeSessionId?: string
  /** 分叉会话的新建 ACP 进程才把先前可见轮次垫进首个 prompt。 */
  forkSeed?: boolean
  onSessionBound?: (acpSessionId: string) => void
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
  const before = liveBySession.get(input.sessionId)
  const live = await ensureLive(input)
  const reused = before != null && liveBySession.get(input.sessionId) === before
  live.runId = input.runId
  live.waitForApproval = input.waitForApproval
  await applyThoughtLevel(live, input.thoughtLevel)
  sessionByRun.set(input.runId, input.sessionId)
  const fellBack = live.client.takeResumeFallBack()
  const text = promptForTurn(input, reused, fellBack)
  const queue: StreamEvent[] = []
  let wake: (() => void) | undefined
  let finished = false
  const configEvent = sessionConfigEvent(input.runId, live.client.getConfigOptions())
  if (configEvent) queue.push(configEvent)
  if (fellBack) {
    queue.push({
      type: "generation.warning",
      runId: input.runId,
      code: "acp_resume_fallback",
      message: "ACP_RESUME_FALLBACK: Could not resume the CLI session; started a new one."
    })
  }

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
    dispose: async () => undefined
  }
}

/** Stop：只取消当前 turn，保留 ACP 进程与会话上下文。 */
export async function cancelAcpTurn(runId: string): Promise<void> {
  const sessionId = sessionByRun.get(runId)
  sessionByRun.delete(runId)
  const live = sessionId ? liveBySession.get(sessionId) : undefined
  if (live) await live.client.cancel(live.acpSessionId)
}

export async function disposeAcpTurn(runId: string): Promise<void> {
  const sessionId = sessionByRun.get(runId)
  sessionByRun.delete(runId)
  if (sessionId) await disposeAcpSession(sessionId)
}

export function acpSessionAlive(sessionId: string): boolean {
  const live = liveBySession.get(sessionId)
  return Boolean(live?.client.stillAlive())
}

export async function disposeAcpSession(sessionId: string): Promise<void> {
  const live = liveBySession.get(sessionId)
  liveBySession.delete(sessionId)
  if (!live) return
  if (live.acpSessionId) await live.client.closeSession(live.acpSessionId)
  live.client.dispose()
}

/** 退出应用时立刻杀掉全部 ACP 子进程，避免泄漏。 */
export function disposeAllAcpSessions(): void {
  for (const live of liveBySession.values()) live.client.dispose("kill")
  liveBySession.clear()
  sessionByRun.clear()
  inflightBySession.clear()
}

function promptForTurn(input: StreamAcpTurnInput, reused: boolean, fellBack: boolean): string {
  const resumed = Boolean(input.resumeSessionId) && !fellBack
  return composeAcpPrompt(input.messages, {
    customInstructions: input.customInstructions,
    skillCatalog: input.skillCatalog,
    // 新建进程或 resume 失败才垫可见正文。活会话和成功 resume 仍只发最后一句。
    seedPriorTranscript: !reused && !resumed
  })
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
    override: { ...input.override, pluginDirs: input.pluginDirs },
    env: input.env,
    spawnDirect: input.spawnDirect
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
    live.acpSessionId = await live.client.handshake(
      acpHandshakeCwd(input.workspaceRoot, input.spawnDirect),
      input.mcpServers ?? [],
      input.resumeSessionId
    )
    input.onSessionBound?.(live.acpSessionId)
    liveBySession.set(input.sessionId, live)
    return live
  } catch (error) {
    live.client.dispose("kill")
    throw mapAcpSpawnFailure(error, input.spawnDirect?.failHint)
  }
}

export async function deleteAcpRemoteIfLive(sessionId: string): Promise<void> {
  const live = liveBySession.get(sessionId)
  if (!live?.acpSessionId) return
  await live.client.deleteRemoteSession(live.acpSessionId)
}

export async function setAcpConfigOption(
  sessionId: string,
  configId: string,
  value: string
): Promise<{ ok: boolean; pending?: boolean; configOptions?: SessionConfigOption[] }> {
  const live = liveBySession.get(sessionId)
  if (!live?.client.stillAlive()) return { ok: true, pending: true }
  const configOptions = await live.client.setConfigOption(live.acpSessionId, configId, value)
  return { ok: true, configOptions }
}

async function applyThoughtLevel(live: LiveAcp, thoughtLevel: string | undefined): Promise<void> {
  const wanted = thoughtLevel?.trim()
  if (!wanted) return
  const option = thoughtLevelOption(live.client.getConfigOptions())
  if (!option || !option.choices.some((item) => item.value === wanted)) return
  if (option.currentValue === wanted) return
  try {
    await live.client.setConfigOption(live.acpSessionId, option.id, wanted)
  } catch {
    /* 模型不认该档时继续用 Agent 默认值 */
  }
}

function modelKeyFor(input: StreamAcpTurnInput): string {
  return acpProcessKey(
    input.toolId,
    input.override?.modelId,
    input.env,
    acpMcpFingerprint(input.mcpServers ?? []),
    input.pluginDirs?.join("|")
  )
}
