/**
 * CLI / I1 模型行图标：有族名画 ModelBrandIcon，否则回落引擎标，不要插头。
 */
import type { AgentCliModel } from "@enjoy-agents/ipc-contract"
import { ModelBrandIcon, ProviderIcon } from "@renderer/components/settings/providers/provider-icons"
import { AgentBrandIcon } from "./agent-brand-icon"
import { cliModelEngineFallback, cliModelFamilyKey, cliModelIconMode, cliModelIconQuery } from "./cli-model-icon"

export function CliModelMark({
  agentId,
  model,
  fallbackProvider,
  size = 15
}: {
  agentId: string
  model: Pick<AgentCliModel, "id" | "label">
  fallbackProvider?: { kind?: string; name?: string; apiStyle?: string }
  size?: number
}) {
  if (cliModelFamilyKey(model.id, model.label)) {
    const query = cliModelIconQuery(model)
    return (
      <ModelBrandIcon
        modelId={query.modelId}
        providerKind={fallbackProvider?.kind || query.providerKind}
        apiStyle={fallbackProvider?.apiStyle}
        size={size}
      />
    )
  }
  if (fallbackProvider?.kind) {
    return (
      <ProviderIcon
        kind={fallbackProvider.kind}
        name={fallbackProvider.name}
        apiStyle={fallbackProvider.apiStyle}
        size={size}
      />
    )
  }
  if (cliModelIconMode(agentId, model.id, model.label) === "engine") {
    return <AgentBrandIcon id={agentId} size={size} />
  }
  return <AgentBrandIcon id={cliModelEngineFallback(agentId, model.id)} size={size} />
}
