/**
 * 活泵期间挂二次确认 approvalGate；泵结束必须解绑。
 */
import { rememberApproval } from "./approval-hmac"
import { checkpointActiveRun } from "./flush-agent-run"
import { createId } from "./ids"
import { armCatchUpPark } from "./park-catch-up-approval"
import { emitEvent, type ActiveRun } from "./agent-run-state"

export async function waitSecondConfirmApproval(
  runId: string,
  run: ActiveRun,
  args: unknown
): Promise<"allow" | "deny" | "allow_session" | "allow_always"> {
  const approvalId = createId("apr")
  const toolCallId = run.tools.at(-1)?.id || createId("tool")
  run.pendingApprovals.push({ approvalId, toolCallId, name: "desktop_act", args })
  rememberApproval({ runId, approvalId, toolCallId, name: "desktop_act", args })
  checkpointActiveRun(run)
  emitEvent(run.window, {
    type: "approval.required",
    runId,
    approvalId,
    toolCallId,
    name: "desktop_act",
    args
  })
  armCatchUpPark(run, runId)
  return run.approvalGate.wait(approvalId)
}

export async function bindSecondConfirmWaiter(runId: string, run: ActiveRun) {
  const { bindDesktopSecondConfirmWait } = await import(
    "./builtin-tools/computer-use/desktop-second-confirm-park"
  )
  bindDesktopSecondConfirmWait((args) => waitSecondConfirmApproval(runId, run, args))
}

export async function unbindSecondConfirmWaiter() {
  const { bindDesktopSecondConfirmWait } = await import(
    "./builtin-tools/computer-use/desktop-second-confirm-park"
  )
  bindDesktopSecondConfirmWait(null)
}
