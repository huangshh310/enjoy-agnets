/**
 * HarnessAgent 共用字段：审批、只读模式、自定义说明。
 */
import { systemPromptFor, toHarnessApprovalSettings } from "@enjoy-agents/agent-core"
import { inactiveToolsForMode } from "../inactive-tools.ts"
import { sandboxConfigFor } from "../sandbox-for.ts"
import type { CreateHarnessCodingAgentInput } from "../types.ts"

export function sharedHarnessSettings(
  input: CreateHarnessCodingAgentInput,
  builtinNames?: readonly string[]
) {
  const settings = toHarnessApprovalSettings(input.mode, input.policy)
  const inactiveTools = filterInactive(inactiveToolsForMode(input.mode), builtinNames)
  const instructions = [systemPromptFor(input.mode), input.customInstructions?.trim()]
    .filter(Boolean)
    .join("\n")
  return {
    instructions,
    permissionMode: settings.permissionMode,
    toolApproval: settings.toolApproval,
    ...(inactiveTools ? { inactiveTools: inactiveTools as never } : {}),
    ...sandboxConfigFor(input.workspaceRoot)
  }
}

function filterInactive(inactive: string[] | undefined, builtinNames?: readonly string[]) {
  if (!inactive) return undefined
  const next = builtinNames ? inactive.filter((name) => builtinNames.includes(name)) : inactive
  return next.length > 0 ? next : undefined
}

export function requireProviderKey(input: CreateHarnessCodingAgentInput, label: string): string {
  const key = input.credentials.providerApiKey.trim()
  if (!key) throw new Error(`Add a ${label} provider in Settings → Providers.`)
  return key
}
