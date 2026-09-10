/**
 * CLI 覆盖补丁合并。upsert 常把未改的键写成 undefined，不能展开进已有绑定。
 */

export type AgentToolOverride = {
  enabled?: boolean
  binaryPath?: string
  extraArgs?: string[]
  modelId?: string
  providerId?: string
  useCustomProvider?: boolean
}

/** undefined = 没改。只改模型时必须保住 useCustomProvider / providerId。 */
export function mergeAgentToolOverride(
  existing: AgentToolOverride | undefined,
  patch: AgentToolOverride
): AgentToolOverride {
  const next: AgentToolOverride = { ...existing }
  if (patch.enabled !== undefined) next.enabled = patch.enabled
  if (patch.binaryPath !== undefined) next.binaryPath = patch.binaryPath
  if (patch.extraArgs !== undefined) next.extraArgs = patch.extraArgs
  if (patch.modelId !== undefined) next.modelId = patch.modelId
  if (patch.providerId !== undefined) next.providerId = patch.providerId
  if (patch.useCustomProvider !== undefined) next.useCustomProvider = patch.useCustomProvider
  return next
}
