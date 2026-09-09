/**
 * CLI 引擎面板：模型表或未装安装条。不画协议/路径微标。
 */
import { capabilitiesOf, type AgentCliModel, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { RiCompass3Line } from "@remixicon/react"
import { canSwitchAgent } from "@renderer/lib/agent-runtime"
import { useT } from "@renderer/i18n"
import { AgentCliInstall } from "./agent-cli-install"
import { AgentCliModels } from "./agent-cli-models"
import { engineReadiness, readinessSubtitle } from "./engine-readiness"

export function AgentCliPane({
  agent,
  onUse,
  onInstalled
}: {
  agent: AgentToolPublic
  onUse: (model?: AgentCliModel) => void
  onInstalled: () => void
}) {
  const t = useT()
  const switchable = canSwitchAgent(agent)
  const kind = engineReadiness({
    id: agent.id,
    status: agent.status,
    comingSoon: agent.comingSoon,
    requiresLogin: capabilitiesOf(agent).login,
    loggedIn: agent.authAccount?.loggedIn ?? null
  })
  const subtitle = readinessSubtitle(kind, t)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {switchable ? (
        <>
          <AgentCliModels
            agent={agent}
            onPick={(model) => onUse(model)}
            onUseDefault={() => onUse()}
          />
          <div className="border-t border-separator-border bg-background-secondary-default/40 px-3.5 py-2 text-caption-2-medium text-text-tertiary">
            {subtitle ? <p className="text-text-secondary">{subtitle}</p> : null}
            <p className={subtitle ? "mt-1 truncate" : "truncate"} title={t("chat.cliFastViaModel")}>
              {t("chat.cliFastViaModel")}
            </p>
          </div>
        </>
      ) : agent.comingSoon ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <RiCompass3Line className="size-8 text-text-tertiary opacity-60" />
          <p className="mt-2 text-body-medium font-medium text-text-primary">{agent.label}</p>
          <p className="mt-1 text-caption-1-regular text-text-secondary">{t("chat.agentSoonHint")}</p>
        </div>
      ) : (
        <div className="p-3">
          <AgentCliInstall agent={agent} onDone={onInstalled} />
        </div>
      )}
    </div>
  )
}
