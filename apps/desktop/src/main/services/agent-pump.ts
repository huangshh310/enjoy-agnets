/**
 * Agent 泵：开流、消费、审批续跑。内存态在 agent-run-state。
 */
import { armTimeout, classifyError, resolveTimeoutMs, RuntimeError } from "@enjoy-agents/agent-core"
import { rememberApproval } from "./approval-hmac"
import { consumeFullStream } from "./consume-stream"
import { completeAgentRun } from "./complete-agent-run"
import { persistActiveRun } from "./flush-agent-run"
import { createId } from "./ids"
import { disposeCodingStream, openCodingStream } from "./open-coding-stream"
import { decideAfterConsume } from "./park-for-approval"
import { shouldContinueOpenTodos, TODO_CONTINUE_PROMPT } from "./todo-continue"
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
  await consumeRun(runId, run, opened.stream)
  const extraMessages = await readResponseMessages(opened.result)
  if (extraMessages.length > 0) {
    run.messages.push(...ensureAssistantReasoning(extraMessages, run.transcript.think))
  }
  if (parkForApproval(run)) return
  if (timedOut()) throw new RuntimeError("timeout", "Agent total timeout.", true)
  if (queueOpenTodoContinue(run)) {
    await opened.dispose()
    return
  }
  completeAgentRun({
    runId,
    run,
    emit: (event) => emitEvent(run.window, event)
  })
  await opened.dispose()
  deleteActiveRun(runId)
}

/** 模型用计划文字收工但 Todo 未完成时，同 run 再开一轮 ToolLoop。 */
function queueOpenTodoContinue(run: ActiveRun): boolean {
  if (
    !shouldContinueOpenTodos({
      aborted: run.abort.signal.aborted,
      todoContinues: run.todoContinues,
      tools: run.tools
    })
  ) {
    return false
  }
  run.todoContinues += 1
  run.messages.push({ role: "user", content: TODO_CONTINUE_PROMPT })
  run.continuePump = true
  return true
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
  // 不要重置 transcript/tools：审批后再泵一轮要叠在同一份上，失败才能整段落库。
  await consumeFullStream({
    stream,
    runId,
    window: run.window,
    tools: run.tools,
    transcript: run.transcript,
    onApproval: (pending) => {
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
}

function parkForApproval(run: ActiveRun): boolean {
  const decision = decideAfterConsume({
    pendingCount: run.pendingApprovals.length,
    resumeAfterPump: run.resumeAfterPump,
    lastToolState: run.tools.at(-1)?.state
  })
  if (decision === "park") return true
  if (decision === "continue") {
    run.resumeAfterPump = false
    run.continuePump = true
    return true
  }
  return false
}

async function failPump(runId: string, run: ActiveRun, error: unknown) {
  const classified = classifyError(error)
  persistActiveRun(run, runId, "failed", classified.message)
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
  if (!current || current.pendingApprovals.length > 0) return
  if (current.continuePump || current.resumeAfterPump) {
    current.continuePump = false
    current.resumeAfterPump = false
    void pumpStream(runId)
  }
}
