/**
 * 这个助手用：Cline/OpenCode 式下拉（官方登录 + 可筛选供应商），不铺电台列表。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { AgentToolBoundExtras } from "./agent-tool-provider-bind"
import { AgentToolNeedProvider, useAgentProviderCreate } from "./agent-tool-need-provider"
import { AgentToolSourceMenu } from "./agent-tool-source-menu"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolProvider({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const create = useAgentProviderCreate(tool, actions)
  const profiles = actions.compatibleProviders
  const bound = actions.allProviders.find((item) => item.id === tool.providerId)
  const usingProvider = Boolean(tool.useCustomProvider && bound)

  if (!actions.supportsCustomInjection) return null

  return (
    <section className="flex flex-col gap-2.5">
      <h4 className="text-body-medium font-semibold text-text-primary">
        {t("settings.agentTools.providerMode")}
      </h4>
      <AgentToolSourceMenu
        tool={tool}
        profiles={profiles}
        bound={bound}
        usingProvider={usingProvider}
        persist={actions.persist}
        protocol={create.protocol}
        canAdd={create.canAdd}
        onAdd={create.openAdd}
      />
      {usingProvider && bound ? (
        <AgentToolBoundExtras tool={tool} actions={actions} profile={bound} />
      ) : null}
      <AgentToolNeedProvider create={create} />
    </section>
  )
}
