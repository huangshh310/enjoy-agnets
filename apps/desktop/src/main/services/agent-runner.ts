/**
 * Agent 编排入口：启动 / 中止 / 审批。泵与内存态在独立模块。
 */
import { AbortAgentInput } from "@enjoy-agents/ipc-contract"
import { abortActiveRunMemory } from "./abort-active-run"
import { cancelCodingStream } from "./open-coding-stream"

export { createSession, listMessages, listSessions, patchSession } from "./session-queries"
export { runAgent, resumeAgentRun } from "./agent-run-start"
export { steerAgent } from "./runtime-interact/steer-agent"
export { emitEvent, holdAgentRun } from "./agent-run-state"
export { pumpStream } from "./agent-pump"
export { decideApproval } from "./decide-approval"

export async function abortAgent(rawInput: unknown) {
  const { runId } = AbortAgentInput.parse(
    typeof rawInput === "string" ? { runId: rawInput } : rawInput
  )
  const run = abortActiveRunMemory(runId)
  await cancelCodingStream(runId)
  const { endDesktopActOverlay } = await import("./builtin-tools/desktop-overlay-chrome")
  const { cancelInFlightDesktopAct } = await import("./builtin-tools/computer-use/desktop-tools")
  endDesktopActOverlay()
  cancelInFlightDesktopAct({
    runId,
    sessionId: run?.input.sessionId
  })
  return { ok: true }
}
