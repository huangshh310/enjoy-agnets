/**
 * CLI 模型表。未登录先画实心登录，禁止「使用 {name}」冒充已就绪。
 */
import type { AgentCliModel, AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { CliModelsBrowser } from "./cli-models-browser"
import { CliNeedLogin } from "./cli-need-login"
import { shouldShowCliProviderNav } from "./cli-provider-rows"
import type { EngineReadiness } from "./engine-readiness"

export function AgentCliModels({
  agent,
  readiness,
  onPick,
  onUseDefault,
  onLoginProvider,
  onLoginEngine,
  loginBusy,
  loginHint,
  inspecting
}: {
  agent: AgentToolPublic
  readiness: EngineReadiness
  onPick: (model: AgentCliModel) => void
  onUseDefault?: () => void
  onLoginProvider?: (providerId: string) => void
  onLoginEngine?: () => void
  loginBusy?: string | null
  loginHint?: string
  inspecting?: boolean
}) {
  const showNav = shouldShowCliProviderNav(agent)
  const needEngineLogin =
    readiness === "needs_login" ||
    readiness === "inspecting" ||
    readiness === "authorizing" ||
    readiness === "login_failed"
  if (!showNav && needEngineLogin) {
    return (
      <CliNeedLogin
        name={agent.label}
        busy={Boolean(loginBusy)}
        hint={loginHint}
        inspecting={readiness === "inspecting" && !loginBusy}
        authorizing={readiness === "authorizing"}
        failed={readiness === "login_failed"}
        onLogin={() => onLoginEngine?.()}
      />
    )
  }
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
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <p className="text-caption-1-medium text-text-tertiary">{t("chat.agentCliModel")}</p>
      <button
        type="button"
        className="rounded-full bg-accent-500 px-3 py-1 text-caption-1-medium text-text-white hover:bg-accent-600"
        onClick={() => onUseDefault?.()}
      >
        {t("chat.agentUse", { name: agent.label })}
      </button>
    </div>
  )
}
