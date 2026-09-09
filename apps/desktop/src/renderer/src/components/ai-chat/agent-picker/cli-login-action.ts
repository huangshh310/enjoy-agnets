/**
 * CLI 按供应商登录：打开页只等 callback，Credentials saved 才刷新。
 */
import type { AgentToolId, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { isAwaitingCallback } from "./cli-login-hint"
import { waitCliProviderReady } from "./cli-login-wait"

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
  return outcome === "ready"
    ? { ok: true, message: "logged_in" }
    : { ok: false, message: "callback_timeout" }
}
