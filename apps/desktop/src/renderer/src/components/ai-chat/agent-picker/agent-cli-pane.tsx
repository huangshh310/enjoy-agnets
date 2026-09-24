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
import { completeCliEngineLogin, completeCliProviderLogin } from "./cli-login-action"
import { useCliLoginLoop } from "./cli-login-loop"
import { loginHintFor } from "./cli-login-hint"
import { engineReadiness, readinessSubtitle } from "./engine-readiness"
import { readinessInputOf } from "./engine-readiness-input"
import { formatOfficialLoginFailLine } from "./official-login-reason"
import { AcpSessionImport } from "./acp-session-import"

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
  const loop = useCliLoginLoop(agent.id)
  const [loginBusy, setLoginBusy] = useState<string | null>(null)
  const [loginHint, setLoginHint] = useState("")
  const switchable = canSwitchAgent(agent)
  const kind = engineReadiness(readinessInputOf(agent, { loginLoop: loop.phase }))
  const loopHint =
    kind === "authorizing"
      ? t("settings.agentTools.loginAuthorizingHint")
      : kind === "login_failed"
        ? formatOfficialLoginFailLine(loop.reason, t)
        : loginHint
  const subtitle = readinessSubtitle(kind, t)
  const cap = capabilitiesOf(agent)

  async function finishLogin(result: { ok: boolean; message: string }) {
    setLoginHint(loginHintFor(result.message, result.ok, t))
    if (!result.ok) return
    onInstalled()
    onUse()
  }

  async function loginProvider(providerId: string) {
    if (!hasIde() || loginBusy) return
    setLoginBusy(providerId)
    try {
      await finishLogin(await completeCliProviderLogin({
        toolId: agent.id as AgentToolId,
        providerId
      }))
    } finally {
      setLoginBusy(null)
    }
  }

  async function loginEngine() {
    if (!hasIde() || loginBusy) return
    setLoginBusy(agent.id)
    try {
      await finishLogin(await completeCliEngineLogin({ toolId: agent.id as AgentToolId }))
    } finally {
      setLoginBusy(null)
    }
  }

  if (!switchable) {
    return agent.comingSoon ? <CliSoonPane label={agent.label} /> : (
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <AgentCliInstall agent={agent} onDone={onInstalled} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
      <AgentCliModels
        agent={agent}
        readiness={kind}
        onPick={(model) => onUse(model)}
        onUseDefault={() => onUse()}
        onLoginProvider={(id) => void loginProvider(id)}
        onLoginEngine={() => void loginEngine()}
        loginBusy={loginBusy}
        loginHint={loopHint}
        inspecting={inspecting}
      />
      <AcpSessionImport runtimeId={agent.id} />
      <CliPaneFoot
        hint={loopHint}
        subtitle={subtitle}
        showFastNote={cap.fast !== "none" || cap.thinking !== "none"}
      />
    </div>
  )
}

function CliSoonPane({ label }: { label: string }) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
      <RiCompass3Line className="size-8 text-text-tertiary opacity-60" />
      <p className="text-body-medium font-medium text-text-primary">{label}</p>
      <p className="text-caption-1-regular text-text-secondary">{t("chat.agentSoonHint")}</p>
    </div>
  )
}

function CliPaneFoot({
  hint,
  subtitle,
  showFastNote
}: {
  hint: string
  subtitle: string
  showFastNote: boolean
}) {
  const t = useT()
  if (!hint && !subtitle && !showFastNote) return null
  return (
    <div className="border-t border-separator-border bg-background-secondary-default/40 px-3.5 py-2 text-caption-2-medium text-text-tertiary">
      {hint ? <p className="text-text-secondary">{hint}</p> : null}
      {subtitle ? <p className={hint ? "mt-1 text-text-secondary" : "text-text-secondary"}>{subtitle}</p> : null}
      {showFastNote ? (
        <p className={hint || subtitle ? "mt-1 truncate" : "truncate"} title={t("chat.cliFastViaModel")}>
          {t("chat.cliFastViaModel")}
        </p>
      ) : null}
    </div>
  )
}
