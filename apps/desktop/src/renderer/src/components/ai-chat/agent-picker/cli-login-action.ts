/**
 * CLI 按供应商登录：打开页只等 callback，Credentials saved 才刷新。
 */
import type { AgentToolId, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { isAwaitingCallback } from "./cli-login-hint"
import { useCliLoginLoopStore } from "./cli-login-loop"
import { waitCliEngineReady, waitCliProviderReady } from "./cli-login-wait"

export async function completeCliProviderLogin(opts: {
  toolId: AgentToolId
  providerId: string
}): Promise<{ ok: boolean; message: string }> {
  const result = (await getIde().agentTools.login({
    id: opts.toolId,
    provider: opts.providerId
  })) as { ok?: boolean; message?: string }
  const message = result.message ?? "failed"
  if (!result.ok) return { ok: false, message }
  if (!isAwaitingCallback(message)) return { ok: true, message }
  const outcome = await waitCliProviderReady({
    providerId: opts.providerId,
    inspect: () =>
      getIde().agentTools.inspect({
        id: opts.toolId,
        refresh: true
      }) as Promise<InspectAgentToolResult>
  })
  return finishWait(outcome)
}

/** 非 OMP：detached spawn ≠ 已登录，必须等到 inspect.loggedIn。 */
export async function completeCliEngineLogin(opts: {
  toolId: AgentToolId
}): Promise<{ ok: boolean; message: string }> {
  const loop = useCliLoginLoopStore.getState()
  loop.begin(opts.toolId)
  const result = (await getIde().agentTools.login({
    id: opts.toolId
  })) as { ok?: boolean; message?: string }
  const message = result.message ?? "failed"
  if (!result.ok) {
    loop.fail(opts.toolId, message)
    return { ok: false, message }
  }
  const outcome = await waitCliEngineReady({
    inspect: () =>
      getIde().agentTools.inspect({
        id: opts.toolId,
        refresh: true
      }) as Promise<InspectAgentToolResult>
  })
  const finished = finishWait(outcome)
  if (finished.ok) loop.succeed(opts.toolId)
  else loop.fail(opts.toolId, finished.message)
  return finished
}

function finishWait(outcome: "ready" | "timeout" | "cancelled"): { ok: boolean; message: string } {
  if (outcome === "ready") return { ok: true, message: "logged_in" }
  if (outcome === "cancelled") return { ok: false, message: "failed" }
  return { ok: false, message: "callback_timeout" }
}
