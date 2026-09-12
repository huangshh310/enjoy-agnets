/**
 * 这个助手用：标签 + 双行账号/模型。添加档案在菜单外，CRUD 只在供应商页。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { AgentToolAddArchiveLink } from "./agent-tool-add-archive-link"
import { BindField } from "./bind-source/bind-field"
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
    <section className="flex flex-col gap-3">
      <header>
        <h4 className="text-headline-medium text-text-primary">{t("settings.agentTools.providerMode")}</h4>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
          {t("settings.agentTools.providerModeHint")}
        </p>
      </header>
      <BindField label={t("settings.agentTools.bindAccountLabel")}>
        <AgentToolSourceMenu
          tool={tool}
          profiles={profiles}
          bound={bound}
          usingProvider={usingProvider}
          persist={actions.persist}
        />
        <AgentToolAddArchiveLink empty={profiles.length === 0} />
      </BindField>
      {usingProvider && bound ? (
        <AgentToolBoundExtras tool={tool} actions={actions} profile={bound} />
      ) : null}
    </section>
  )
}
