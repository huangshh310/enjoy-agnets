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
import { runWasStopped } from "./run-stopped"
import {
  APPROVAL_ARGS_MISSING,
  APPROVAL_ARGS_MISSING_MESSAGE,
  isMissingApprovalArgs
} from "./resolve-approval-args"

export async function waitForSubagentApproval(
  run: ActiveRun,
  runId: string,
  input: { toolName: string; toolCallId: string; input: unknown }
): Promise<"allow" | "deny" | "allow_session"> {
  const { toolName, toolCallId, input: args } = input
  // 父一轮已被用户停止：子 Agent 迟到的审批整条丢（不落审批行、不挂未决、不推卡），直接拒，工具不执行。
  if (runWasStopped(run)) return "deny"
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
  if (isMissingApprovalArgs(args)) {
    emitEvent(run.window, {
      type: "tool.result",
      runId,
      toolCallId,
      name: toolName,
      args,
      result: { code: APPROVAL_ARGS_MISSING },
      error: APPROVAL_ARGS_MISSING_MESSAGE
    })
    return "deny"
  }
  const parked = await parkToolArgs(toolName, asParkArgs(args))
  // 停止落在上面这个 await 里：同样丢掉。
  if (runWasStopped(run)) return "deny"
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
