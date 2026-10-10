/**
 * 非聊天生成入口：文本、结构化、媒体、embedding；kind=agent 转发 runAgent。密钥不出 main。
 */
import type { BrowserWindow } from "electron"
import {
  logAndClassifyError,
  parseGenerationCheckpoint,
  resolveTimeoutMs,
  tokensPerSecond,
  ttfoMs,
  videoTimeoutMs,
  withTimeout
} from "@enjoy-agents/agent-core"
import { AiAbortInput, AiGenerateInput, AiResumeInput } from "@enjoy-agents/ipc-contract"
import { getRun, updateRun } from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { stampAndSend } from "./event-bus"
import { createId } from "./ids"
import { recordMetric } from "./telemetry-service"
import { readPreferences } from "./preferences"
import { requireAgentRunId } from "@enjoy-agents/ipc-contract/chat-readiness"
import { BACKGROUND_AGENT_TRUST } from "./agent-run-trust"
import { abortAgent, resumeAgentRun, runAgent } from "./agent-runner"
import { startE2eGeneration } from "./e2e-generate"
import { isE2eStub } from "./e2e-stub"
import { rememberGenerationRun } from "./persist-run"
import { parseAgentCheckpointExtras, TOOL_BOUNDARY } from "./running-orphan-plan"
import { resumeWorkflow } from "./workflow-runner"
import { executeKind } from "./ai-generation-kinds"

const controllers = new Map<string, AbortController>()

/** kind=agent 走同一条 ToolLoop + 审批，不另开无 host 的循环。 */
async function startAgentKind(
  window: BrowserWindow,
  request: ReturnType<typeof AiGenerateInput.parse>
) {
  if (!request.workspaceId) throw new Error("agent generate requires workspaceId.")
  const messages = request.messages?.length
    ? request.messages
    : [{ role: "user" as const, content: request.prompt ?? "" }]
  const started = await runAgent(
    window,
    {
      sessionId: request.sessionId,
      workspaceId: request.workspaceId,
      modelId: request.modelId,
      messages,
      attachments: request.attachments
    },
    BACKGROUND_AGENT_TRUST
  )
  const runId = requireAgentRunId(started)
  rememberGenerationRun({ runId, request })
  return { runId, kind: "agent" as const }
}

export async function startGeneration(window: BrowserWindow, raw: unknown) {
  const request = AiGenerateInput.parse(raw)
  if (request.kind === "agent") {
    return startAgentKind(window, request)
  }
  if (isE2eStub()) {
    return startE2eGeneration(window, request)
  }
  const runId = createId("run")
  rememberGenerationRun({ runId, request })
  const abort = new AbortController()
  controllers.set(runId, abort)
  stampAndSend(
    window,
    { type: "run.start", runId, sessionId: request.sessionId, kind: request.kind },
    request.sessionId
  )
  void runKind(window, runId, request, abort.signal)
  return { runId, kind: request.kind }
}

export async function abortGeneration(raw: unknown) {
  const input = AiAbortInput.parse(raw)
  controllers.get(input.runId)?.abort()
  await abortAgent({ runId: input.runId })
  updateRun(getDatabase(), input.runId, { status: "cancelled" })
  return { ok: true }
}

export async function resumeGeneration(window: BrowserWindow, raw: unknown) {
  const input = AiResumeInput.parse(raw)
  const row = getRun(getDatabase(), input.runId)
  if (!row) throw new Error("Run not found.")
  if (row.kind === "workflow") {
    const resumed = await resumeWorkflow(input.runId)
    stampAndSend(
      window,
      { type: "workflow.resumed", runId: input.runId, checkpointId: resumed.lastCheckpointId },
      resumed.sessionId
    )
    return { ok: true, runId: input.runId }
  }
  const snapshot = parseGenerationCheckpoint(row.checkpoint)
  if (!snapshot) throw new Error(`Run ${input.runId} has no generation snapshot to resume.`)
  const request = AiGenerateInput.parse({
    ...snapshot.request,
    attachments: snapshot.request.attachments ?? []
  })
  if (request.kind === "agent") {
    const extras = parseAgentCheckpointExtras(row.checkpoint)
    await resumeAgentRun(
      window,
      input.runId,
      request,
      extras.resumeAt === TOOL_BOUNDARY ? extras.modelMessages : undefined,
      { denyAnyDesktop: extras.denyAnyDesktop, automationSource: extras.automationSource, origin: extras.origin }
    )
    return { ok: true, runId: input.runId }
  }
  if (isE2eStub()) {
    await startE2eGeneration(window, request, input.runId)
    return { ok: true, runId: input.runId }
  }
  rememberGenerationRun({ runId: input.runId, request, status: "running" })
  const abort = new AbortController()
  controllers.set(input.runId, abort)
  stampAndSend(
    window,
    { type: "run.start", runId: input.runId, sessionId: request.sessionId, kind: request.kind },
    request.sessionId
  )
  void runKind(window, input.runId, request, abort.signal)
  return { ok: true, runId: input.runId }
}

async function runKind(
  window: BrowserWindow,
  runId: string,
  request: ReturnType<typeof AiGenerateInput.parse>,
  signal: AbortSignal
) {
  const started = Date.now()
  let firstTokenAt: number | undefined
  const noteFirst = () => {
    firstTokenAt = firstTokenAt ?? Date.now()
  }
  try {
    const budget =
      request.kind === "video"
        ? videoTimeoutMs(resolveTimeoutMs(request.timeoutMs, readPreferences().agentTimeoutMs) ?? 0)
        : resolveTimeoutMs(request.timeoutMs, readPreferences().agentTimeoutMs)
    await withTimeout(
      (nested) =>
        executeKind(window, runId, request, nested, noteFirst),
      budget,
      signal
    )
    updateRun(getDatabase(), runId, { status: "completed" })
    const durationMs = Date.now() - started
    recordMetric({
      runId,
      kind: request.kind,
      modelId: request.modelId,
      status: "completed",
      durationMs,
      ttfoMs: ttfoMs(started, firstTokenAt),
      tokensPerSecond: tokensPerSecond(undefined, durationMs)
    })
    stampAndSend(
      window,
      { type: "run.end", runId, kind: request.kind, turn: { workflow: "todo", attention: "complete" } },
      request.sessionId
    )
  } catch (error) {
    const classified = logAndClassifyError("ai-generation", error)
    updateRun(getDatabase(), runId, { status: "failed", error: classified.message })
    recordMetric({
      runId,
      kind: request.kind,
      modelId: request.modelId,
      status: "failed",
      durationMs: Date.now() - started,
      errorClass: classified.errorClass
    })
    stampAndSend(
      window,
      {
        type: "run.error",
        runId,
        kind: request.kind,
        message: classified.message,
        turn: { workflow: "in_progress", attention: "error" }
      },
      request.sessionId
    )
    if (classified.errorClass === "timeout") {
      stampAndSend(
        window,
        { type: "generation.warning", runId, code: "timeout", message: classified.message },
        request.sessionId
      )
    }
  } finally {
    controllers.delete(runId)
  }
}
