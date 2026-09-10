/**
 * 从 CLI 快照拼动力源入参。Enjoy 用当前档案；OMP 用自己的供应商。
 */
import {
  describePowerSource,
  ompPowerFromSelection,
  type AgentToolPublic,
  type PowerSourceInput,
  type PowerSourceParts,
  type ProviderPublic
} from "@enjoy-agents/ipc-contract"

export function enjoyVaultFromProviders(
  providers: ReadonlyArray<Pick<ProviderPublic, "name" | "modelId" | "active">>,
  defaultModelId?: string
): { archive: string; model: string } {
  const active = providers.find((item) => item.active) ?? providers[0]
  if (!active) return { archive: "", model: "" }
  return {
    archive: active.name,
    model: defaultModelId?.trim() || active.modelId
  }
}

export function powerSourceInputForTool(
  tool: AgentToolPublic,
  opts: {
    inspecting?: boolean
    providers?: ReadonlyArray<Pick<ProviderPublic, "name" | "modelId" | "active">>
    defaultModelId?: string
  } = {}
): PowerSourceInput {
  const enjoy = enjoyVaultFromProviders(opts.providers ?? [], opts.defaultModelId)
  const omp = ompPowerFromSelection(tool.selectedModel, tool.providers)
  return {
    runtimeId: tool.id,
    useCustomProvider: tool.useCustomProvider,
    boundProviderName: tool.boundProviderName || tool.providerId,
    selectedModel: tool.selectedModel,
    loggedIn: tool.authAccount?.loggedIn ?? null,
    inspecting: opts.inspecting,
    enjoyArchive: enjoy.archive,
    enjoyModel: enjoy.model,
    ompSupplier: omp.supplier,
    ompModel: omp.model
  }
}

export function powerSourcePartsForTool(
  tool: AgentToolPublic,
  opts: {
    inspecting?: boolean
    providers?: ReadonlyArray<Pick<ProviderPublic, "name" | "modelId" | "active">>
    defaultModelId?: string
  } = {}
): PowerSourceParts {
  return describePowerSource(powerSourceInputForTool(tool, opts))
}
