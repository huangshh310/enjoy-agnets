/**
 * Agent 泵：开流、消费、审批续跑。内存态在 agent-run-state。
 */
import { armTimeout, classifyError, resolveTimeoutMs, RuntimeError } from "@enjoy-agents/agent-core"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { rememberApproval } from "./approval-hmac"
import { consumeFullStream } from "./consume-stream"
import { completeAgentRun } from "./complete-agent-run"
import { createId } from "./ids"
import { disposeCodingStream, openCodingStream } from "./open-coding-stream"
import { emptyTranscript } from "./persist-session"
import { readResponseMessages } from "./agent-run-helpers"
import { readPreferences } from "./preferences"
import { recordMetric } from "./telemetry-service"
import { ensureAssistantReasoning } from "./to-model-messages"
import {
  deleteActiveRun,
  emitEvent,
  getActiveRun,
  type ActiveRun
} from "./agent-run-state"

export async function pumpStream(runId: string) {
  const run = getActiveRun(runId)
  if (!run || run.pumping) return
  run.pumping = true
  run.pendingApprovals = []

  const prefs = readPreferences()
  const totalMs = resolveTimeoutMs(undefined, prefs.agentTimeoutMs)
  let timedOut = false
  const clearTimer = armTimeout(run.abort, totalMs, () => {
    timedOut = true
  })
  try {
    await runOnePump(runId, run, prefs, () => timedOut)
  } catch (error) {
    await failPump(runId, run, error)
  } finally {
    clearTimer()
    resumeIfNeeded(runId)
  }
}

async function runOnePump(
  runId: string,
  run: ActiveRun,
  prefs: ReturnType<typeof readPreferences>,
  timedOut: () => boolean
) {
  const opened = await openRunStream(runId, run, prefs)
  const { tools, transcript, sawApproval } = await consumeRun(runId, run, opened.stream)
  const extraMessages = await readResponseMessages(opened.result)
  if (extraMessages.length > 0) {
    run.messages.push(...ensureAssistantReasoning(extraMessages, transcript.think))
  }
  if (parkForApproval(run, sawApproval)) return
  if (timedOut()) throw new RuntimeError("timeout", "Agent total timeout.", true)
  completeAgentRun({
    runId,
    sessionId: run.input.sessionId,
    modelId: run.input.modelId,
    content: transcript.visible,
    reasoning: transcript.think,
    tools,
    startedAt: run.startedAt,
    firstTokenAt: run.firstTokenAt,
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    citedSources: run.citedSources,
    emit: (event) => emitEvent(run.window, event)
  })
  await opened.dispose()
  deleteActiveRun(runId)
}

async function openRunStream(
  runId: string,
  run: ActiveRun,
  prefs: ReturnType<typeof readPreferences>
) {
  const effort = run.input.reasoningEffort ?? run.secret?.reasoningEffort
  return openCodingStream({
    runId,
    mode: run.input.mode,
    messages: run.messages,
    abortSignal: run.abort.signal,
    workspaceRoot: run.workspaceRoot,
    sessionId: run.input.sessionId,
    modelId: run.input.modelId,
    secret: run.secret,
    prefs,
    effort,
    sessionApprovedTools: run.sessionApprovedTools,
    waitForSubagentApproval: async ({ toolName, toolCallId, input: args }) => {
      const approvalId = createId("apr")
      run.pendingApprovals.push({ approvalId, toolCallId, name: toolName })
      rememberApproval({ runId, approvalId, toolCallId, name: toolName, args })
      emitEvent(run.window, {
        type: "approval.required",
        runId,
        approvalId,
        toolCallId,
        name: toolName,
        args
      })
      return run.approvalGate.wait(approvalId)
    }
  })
}

async function consumeRun(
  runId: string,
  run: ActiveRun,
  stream: Awaited<ReturnType<typeof openCodingStream>>["stream"]
) {
  const transcript = emptyTranscript()
  const tools: ThreadToolCall[] = []
  let sawApproval = false
  await consumeFullStream({
    stream,
    runId,
    window: run.window,
    tools,
    transcript,
    onApproval: (pending) => {
      sawApproval = true
      run.pendingApprovals.push(pending)
    },
    onFirstToken: () => {
      run.firstTokenAt = run.firstTokenAt ?? Date.now()
    },
    onUsage: (usage) => {
      run.inputTokens = usage.inputTokens ?? run.inputTokens
      run.outputTokens = usage.outputTokens ?? run.outputTokens
    },
    emit: (event) => emitEvent(run.window, event)
  })
  return { tools, transcript, sawApproval }
}

function parkForApproval(run: ActiveRun, sawApproval: boolean): boolean {
  if (run.pendingApprovals.length > 0 && !run.resumeAfterPump) return true
  if (sawApproval || run.resumeAfterPump) {
    run.resumeAfterPump = false
    run.continuePump = true
    return true
  }
  return false
}

async function failPump(runId: string, run: ActiveRun, error: unknown) {
  const classified = classifyError(error)
  recordMetric({
    runId,
    kind: "agent",
    modelId: run.input.modelId,
    status: "failed",
    durationMs: Date.now() - run.startedAt,
    errorClass: classified.errorClass
  })
  emitEvent(run.window, { type: "run.error", runId, message: classified.message })
  if (classified.errorClass === "timeout") {
    emitEvent(run.window, {
      type: "generation.warning",
      runId,
      code: "timeout",
      message: classified.message
    })
  }
  deleteActiveRun(runId)
  await disposeCodingStream(runId)
}

function resumeIfNeeded(runId: string) {
  const current = getActiveRun(runId)
  if (current) current.pumping = false
  if (current && (current.continuePump || current.resumeAfterPump)) {
    current.continuePump = false
    current.resumeAfterPump = false
    void pumpStream(runId)
  }
}
