/**
 * 子 Agent 审批停车。补跑时挂同一条 30min 计时器。
 */
import { isExploreMutatingDeny } from "@enjoy-agents/agent-core"
import { rememberApproval } from "./approval-hmac"
import { toSubagentUserDecision } from "./approval-gate"
import { checkpointActiveRun } from "./flush-agent-run"
import { createId } from "./ids"
import { armCatchUpPark } from "./park-catch-up-approval"
import { emitEvent, type ActiveRun } from "./agent-run-state"

export async function waitForSubagentApproval(
  run: ActiveRun,
  runId: string,
  input: { toolName: string; toolCallId: string; input: unknown }
): Promise<"allow" | "deny" | "allow_session"> {
  const { toolName, toolCallId, input: args } = input
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
  const parked = await parkToolArgs(toolName, asParkArgs(args))
  const approvalId = rememberApproval({
    runId,
    approvalId: createId("apr"),
    toolCallId,
    name: toolName,
    args: parked,
    requestArgs: args
  }).id
  run.pendingApprovals.push({ approvalId, toolCallId, name: toolName, args: parked })
  checkpointActiveRun(run)
  emitEvent(run.window, {
    type: "approval.required",
    runId,
    approvalId,
    toolCallId,
    name: toolName,
    args: parked
  })
  armCatchUpPark(run, runId)
  return toSubagentUserDecision(await run.approvalGate.wait(approvalId))
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
