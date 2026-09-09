/**
 * CLI 引擎面板：模型表或未装安装条。不画协议/路径微标。
 */
import { useState } from "react"
import { capabilitiesOf, type AgentCliModel, type AgentToolId, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { RiCompass3Line } from "@remixicon/react"
import { canSwitchAgent } from "@renderer/lib/agent-runtime"
import { hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { AgentCliInstall } from "./agent-cli-install"
import { AgentCliModels } from "./agent-cli-models"
import { completeCliProviderLogin } from "./cli-login-action"
import { loginHintFor } from "./cli-login-hint"
import { engineReadiness, readinessSubtitle } from "./engine-readiness"

export function AgentCliPane({
  agent,
  onUse,
  onInstalled,
  inspecting
}: {
  agent: AgentToolPublic
  onUse: (model?: AgentCliModel) => void
  onInstalled: () => void
  inspecting?: boolean
}) {
  const t = useT()
  const [loginBusy, setLoginBusy] = useState<string | null>(null)
  const [loginHint, setLoginHint] = useState("")
  const switchable = canSwitchAgent(agent)
  const kind = engineReadiness({
    id: agent.id,
    status: agent.status,
    comingSoon: agent.comingSoon,
    requiresLogin: capabilitiesOf(agent).login,
    loggedIn: agent.authAccount?.loggedIn ?? null
  })
  const subtitle = readinessSubtitle(kind, t)

  async function loginProvider(providerId: string) {
    if (!hasIde() || loginBusy) return
    setLoginBusy(providerId)
    try {
      const result = await completeCliProviderLogin({
        toolId: agent.id as AgentToolId,
        providerId
      })
      setLoginHint(loginHintFor(result.message, result.ok, t))
      if (result.ok) onInstalled()
    } finally {
      setLoginBusy(null)
    }
  }

  if (!switchable) {
    return agent.comingSoon ? <CliSoonPane label={agent.label} /> : (
      <div className="p-3">
        <AgentCliInstall agent={agent} onDone={onInstalled} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AgentCliModels
        agent={agent}
        onPick={(model) => onUse(model)}
        onUseDefault={() => onUse()}
        onLoginProvider={(id) => void loginProvider(id)}
        loginBusy={loginBusy}
        loginHint={loginHint}
        inspecting={inspecting}
      />
      <CliPaneFoot hint={loginHint} subtitle={subtitle} />
    </div>
  )
}

function CliSoonPane({ label }: { label: string }) {
  const t = useT()
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <RiCompass3Line className="size-8 text-text-tertiary opacity-60" />
      <p className="mt-2 text-body-medium font-medium text-text-primary">{label}</p>
      <p className="mt-1 text-caption-1-regular text-text-secondary">{t("chat.agentSoonHint")}</p>
    </div>
  )
}

function CliPaneFoot({ hint, subtitle }: { hint: string; subtitle: string }) {
  const t = useT()
  return (
    <div className="border-t border-separator-border bg-background-secondary-default/40 px-3.5 py-2 text-caption-2-medium text-text-tertiary">
      {hint ? <p className="text-text-secondary">{hint}</p> : null}
      {subtitle ? <p className={hint ? "mt-1 text-text-secondary" : "text-text-secondary"}>{subtitle}</p> : null}
      <p className={hint || subtitle ? "mt-1 truncate" : "truncate"} title={t("chat.cliFastViaModel")}>
        {t("chat.cliFastViaModel")}
      </p>
    </div>
  )
}
