/**
 * 运行中插话：落库用户句，挂到 steeringQueue，等下一个检查点注入。
 */
import type { BrowserWindow } from "electron"
import { deriveTaskStatus, SteerAgentInput } from "@enjoy-agents/ipc-contract"
import { persistUserTurn } from "../persist-user-attachments"
import { createId } from "../ids"
import { getActiveRun, listActiveRuns } from "../agent-run-state"
import { enqueueSteer } from "./steering-queue"

export function getActiveRunBySession(sessionId: string) {
  return listActiveRuns().find((item) => item.run.input.sessionId === sessionId)
}

export async function steerAgent(_window: BrowserWindow, rawInput: unknown) {
  const input = SteerAgentInput.parse(rawInput)
  const found = input.runId
    ? (() => {
        const run = getActiveRun(input.runId!)
        return run ? { runId: input.runId!, run } : undefined
      })()
    : getActiveRunBySession(input.sessionId)
  if (!found) throw new Error("STEER_NO_ACTIVE_RUN")
  persistUserTurn(input.sessionId, input.text, [])
  enqueueSteer(input.sessionId, { id: createId("steer"), text: input.text })
  return {
    ok: true as const,
    runId: found.runId,
    status: deriveTaskStatus({
      running: true,
      pendingApproval: found.run.pendingApprovals.length > 0
    })
  }
}
