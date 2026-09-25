/**
 * Agent 泵：开流、消费、审批续跑。内存态在 agent-run-state。
 */
import {
  armTimeout,
  isExploreMutatingDeny,
  resolveTimeoutMs,
  RuntimeError,
  type SubagentToolTraceEvent
} from "@enjoy-agents/agent-core"
import { foldToolEvent, type HostInjectSnapshot } from "@enjoy-agents/ipc-contract"
import { rememberApproval } from "./approval-hmac"
import { consumeFullStream } from "./consume-stream"
import { shouldEmitRunEnd } from "./claim-run-end"
import { completeAgentRun } from "./complete-agent-run"
import { failAgentPump } from "./fail-agent-pump"
import { checkpointActiveRun } from "./flush-agent-run"
import { persistRunningCheckpoint } from "./persist-running-checkpoint"
import { persistWaitingRun } from "./persist-waiting-run"
import { createId } from "./ids"
import { openCodingStream } from "./open-coding-stream"
import { decideAfterConsume } from "./park-for-approval"
import { shouldContinueOpenTodos, TODO_CONTINUE_PROMPT } from "./todo-continue"
import { readResponseMessages } from "./agent-run-helpers"
import { toSubagentUserDecision } from "./approval-gate"
import { readPreferences } from "./preferences"
import { ensureAssistantReasoning } from "./to-model-messages"
import { runWithActiveRunId } from "./active-run-id"
import { deleteActiveRun, emitEvent, getActiveRun, type ActiveRun } from "./agent-run-state"
import { absorbSteering, absorbSteeringMessages } from "./runtime-interact/absorb-steering"
import { clearSteer } from "./runtime-interact/steering-queue"
import { takeSessionHandoff } from "./session-handoff"
import { looksLikeSshRoot } from "./ssh/refuse-local-cwd.ts"
import { recordEnjoyCheckpoint } from "./workspace-git-checkpoint"

export async function pumpStream(runId: string) {
  const run = getActiveRun(runId)
  if (!run || run.pumping) return
  return runWithActiveRunId(runId, () => pumpBoundStream(runId, run))
}

async function pumpBoundStream(runId: string, run: ActiveRun) {
  run.pumping = true
  run.pendingApprovals = []
  const { bindSecondConfirmWaiter, unbindSecondConfirmWaiter } = await import(
    "./bind-desktop-second-confirm-waiter"
  )
  await bindSecondConfirmWaiter(runId, run)

  const prefs = readPreferences()
  const totalMs = resolveTimeoutMs(undefined, prefs.agentTimeoutMs)
  let timedOut = false
  const clearTimer = armTimeout(run.abort, totalMs, () => {
    timedOut = true
  })
  try {
    await runOnePump(runId, run, prefs, () => timedOut)
  } catch (error) {
    await failAgentPump(runId, run, error)
  } finally {
    clearTimer()
    await unbindSecondConfirmWaiter()
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
  emitHostInject(run, runId, opened.hostInject)
  takeSessionHandoff(run.input.sessionId)
  await consumeRun(runId, run, opened.stream)
  const extraMessages = await readResponseMessages(opened.result)
  if (extraMessages.length > 0) {
    run.messages.push(...ensureAssistantReasoning(extraMessages, run.transcript.think))
  }
  if (parkForApproval(run)) {
    persistWaitingRun(run, runId)
    checkpointActiveRun(run)
    return
  }
  if (timedOut()) throw new RuntimeError("timeout", "Agent total timeout.", true)
  if (queueOpenTodoContinue(run)) {
    persistRunningBoundary(run, runId)
    await opened.dispose()
    return
  }
  if (absorbSteering(run)) {
    persistRunningBoundary(run, runId)
    run.continuePump = true
    await opened.dispose()
    return
  }
  clearSteer(run.input.sessionId)
  if (
    !shouldEmitRunEnd({
      aborted: run.abort.signal.aborted,
      timedOut: timedOut(),
      userCancelled: run.userCancelled
    })
  ) {
    await opened.dispose()
    deleteActiveRun(runId)
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
    workspaceId: run.input.workspaceId,
    sessionId: run.input.sessionId,
    modelId: run.input.modelId,
    secret: run.secret,
    prefs,
    effort,
    thoughtLevel: run.input.thoughtLevel,
    fast: run.input.fast,
    sessionApprovedTools: run.sessionApprovedTools,
    sessionApprovedBashPrefixes: [...run.sessionApprovedBashPrefixes],
    executePlan: run.input.executePlan,
    runtimeId: run.input.runtimeId,
    pullSteeringMessages: () => absorbSteeringMessages(run),
    takeQuestionAnswers: () => {
      const answers = run.questionAnswers
      run.questionAnswers = undefined
      return answers
    },
    waitForSubagentApproval: async ({ toolName, toolCallId, input: args }) => {
      if (isExploreMutatingDeny(run.input.mode, toolName)) {
        emitEvent(run.window, {
          type: "tool.result",
          runId,
          toolCallId,
          name: toolName,
          args,
          error: "Explore mode is read-only."
        })
        return "deny"
      }
      const approvalId = createId("apr")
      const parked = await parkToolArgs(toolName, asParkArgs(args))
      run.pendingApprovals.push({ approvalId, toolCallId, name: toolName, args: parked })
      rememberApproval({ runId, approvalId, toolCallId, name: toolName, args: parked })
      checkpointActiveRun(run)
      emitEvent(run.window, {
        type: "approval.required",
        runId,
        approvalId,
        toolCallId,
        name: toolName,
        args: parked
      })
      return toSubagentUserDecision(await run.approvalGate.wait(approvalId))
    },
    onSubagentToolEvent: (event) => emitSubagentTool(run, runId, event)
  })
}

function emitHostInject(run: ActiveRun, runId: string, snapshot?: HostInjectSnapshot) {
  if (!snapshot) return
  emitEvent(run.window, {
    type: "host.inject",
    runId,
    sessionId: run.input.sessionId,
    runtimeId: snapshot.runtimeId,
    mcp: snapshot.mcp,
    skills: snapshot.skills
  })
}

function emitSubagentTool(run: ActiveRun, runId: string, event: SubagentToolTraceEvent) {
  const payload =
    event.type === "tool.start"
      ? {
          type: "tool.start" as const,
          runId,
          toolCallId: event.toolCallId,
          name: event.name,
          args: event.args,
          parentToolCallId: event.parentToolCallId
        }
      : {
          type: "tool.result" as const,
          runId,
          toolCallId: event.toolCallId,
          name: event.name,
          args: event.args,
          result: event.result,
          error: event.error,
          parentToolCallId: event.parentToolCallId
        }
  foldToolEvent(run.tools, payload)
  emitEvent(run.window, payload)
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
    onCheckpoint: () => {
      checkpointActiveRun(run)
    },
    emit: (event) => {
      emitEvent(run.window, event)
      noteFileChangedCheckpoint(run, runId, event)
    }
  })
  checkpointActiveRun(run)
}

function noteFileChangedCheckpoint(run: ActiveRun, runId: string, event: { type: string }): void {
  if (event.type !== "file.changed" || run.checkpointNoted) return
  run.checkpointNoted = true
  if (looksLikeSshRoot(run.workspaceRoot)) return
  void recordEnjoyCheckpoint(run.workspaceRoot, {
    sessionId: run.input.sessionId,
    runId,
    kind: "turn"
  }).catch(() => undefined)
}

function persistRunningBoundary(run: ActiveRun, runId: string): void {
  persistRunningCheckpoint(run, runId)
  checkpointActiveRun(run)
}

function asParkArgs(args: unknown): Record<string, unknown> {
  return args && typeof args === "object" ? (args as Record<string, unknown>) : {}
}

async function parkToolArgs(toolName: string, args: Record<string, unknown>) {
  if (toolName !== "desktop_act") return args
  const { enrichDesktopActApprovalArgs, parkDesktopActArgs } = await import(
    "./builtin-tools/computer-use/desktop-tools"
  )
  return enrichDesktopActApprovalArgs(parkDesktopActArgs(args))
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
