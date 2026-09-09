/**
 * CLI 模型表。OMP 左栏列可登录供应商；未授权点行即走官方 login。
 */
import type { AgentCliModel, AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { CliModelsBrowser } from "./cli-models-browser"
import { shouldShowCliProviderNav } from "./cli-provider-rows"

export function AgentCliModels({
  agent,
  onPick,
  onUseDefault,
  onLoginProvider,
  loginBusy,
  loginHint,
  inspecting
}: {
  agent: AgentToolPublic
  onPick: (model: AgentCliModel) => void
  onUseDefault?: () => void
  onLoginProvider?: (providerId: string) => void
  loginBusy?: string | null
  loginHint?: string
  inspecting?: boolean
}) {
  const showNav = shouldShowCliProviderNav(agent)
  if (agent.models.length === 0 && !showNav) {
    return <CliModelsEmpty agent={agent} onUseDefault={onUseDefault} />
  }
  return (
    <CliModelsBrowser
      agent={agent}
      onPick={onPick}
      onLoginProvider={onLoginProvider}
      loginBusy={loginBusy}
      loginHint={loginHint}
      inspecting={inspecting}
    />
  )
}

function CliModelsEmpty({
  agent,
  onUseDefault
}: {
  agent: AgentToolPublic
  onUseDefault?: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-caption-1-medium text-text-tertiary">{t("chat.agentCliModel")}</p>
      <button
        type="button"
        className="rounded-full border border-border-button-default px-3 py-1 text-caption-1-medium text-text-primary hover:border-border-button-hover"
        onClick={() => onUseDefault?.()}
      >
        {t("chat.agentUse", { name: agent.label })}
      </button>
    </div>
  )
}
