/**
 * 建 Agent 之前的本地校验：缺 key / 缺沙箱直接拒，不碰到 SDK。
 */
import { resolveHarnessAdapter } from "./catalog.ts"
import type { CreateHarnessCodingAgentInput } from "./types.ts"

export function assertHarnessReady(input: CreateHarnessCodingAgentInput) {
  const adapter = resolveHarnessAdapter(input.adapterId, input.providerKind)
  if (!adapter?.available) {
    const target = input.adapterId || input.providerKind || "this provider"
    throw new Error(`No Harness for ${target} yet. Use Local (ToolLoop) or pick a provider that has an adapter.`)
  }
  if (adapter.needsProviderKey && !input.credentials.providerApiKey.trim()) {
    const kind = adapter.providerKinds[0] ?? "matching"
    throw new Error(`Add a ${kind} provider in Settings → Providers.`)
  }
  if (adapter.sandboxKind === "vercel" && !input.credentials.vercelToken?.trim()) {
    throw new Error(`${adapter.label} still needs a Vercel Sandbox token in Settings → Agent.`)
  }
  return adapter
}
