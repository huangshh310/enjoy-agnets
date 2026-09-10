/**
 * 这个助手用：官方登录 + 已有档案下拉。添加档案在菜单外，CRUD 只在供应商页。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { AgentToolAddArchiveLink } from "./agent-tool-add-archive-link"
import { AgentToolBoundExtras } from "./agent-tool-provider-bind"
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
      />
      <AgentToolAddArchiveLink empty={profiles.length === 0} />
      {usingProvider && bound ? (
        <AgentToolBoundExtras tool={tool} actions={actions} profile={bound} />
      ) : null}
    </section>
  )
}
