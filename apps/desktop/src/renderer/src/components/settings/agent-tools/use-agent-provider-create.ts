/**
 * 就地新建该 CLI 能用的供应商档案，不跳整页列表。
 */
import { useQueryClient } from "@tanstack/react-query"
import {
  createTargetForBind,
  protocolNameForBind,
  providersCompatibleWith,
  type AgentToolPublic,
  type SettingsSnapshot
} from "@enjoy-agents/ipc-contract"
import { isApiStyle, parseProviderKind } from "@enjoy-agents/providers/presets"
import { useProviderSettings } from "../providers/use-provider-settings"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function useAgentProviderCreate(tool: AgentToolPublic, actions: AgentToolActions) {
  const queryClient = useQueryClient()
  const settings = useProviderSettings()
  const protocol = protocolNameForBind(tool.id)
  const target = createTargetForBind(tool.id)

  function openAdd() {
    if (!target) return
    const style = isApiStyle(target.apiStyle) ? target.apiStyle : undefined
    settings.openCreate(parseProviderKind(target.kind), style)
  }

  async function saveAndUse() {
    const before = new Set(settings.providers.map((item) => item.id))
    await settings.save(false)
    const snap = queryClient.getQueryData<SettingsSnapshot>(["settings"])
    const created = snap?.providers.find(
      (item) => !before.has(item.id) && item.hasKey && providersCompatibleWith(tool.id, item)
    )
    if (created) {
      await actions.persist({
        useCustomProvider: true,
        providerId: created.id,
        modelId: created.modelId
      })
    }
  }

  return { protocol, canAdd: Boolean(target), openAdd, saveAndUse, settings }
}
