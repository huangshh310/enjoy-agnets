/**
 * 本机 CLI 助手格：品牌 / 已同步 / 状态点 / 次行；安装中与失败多一行人话。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { formatInstallFailLine, type InstallRowPhase } from "./install-row-copy"
import { formatListSecondary } from "./list-secondary"

export function AgentToolRowAssistant({
  tool,
  ready,
  installPhase,
  installError
}: {
  tool: AgentToolPublic
  ready: boolean
  installPhase: InstallRowPhase
  installError: string | null
}) {
  const t = useT()
  const planned = tool.comingSoon || tool.skillOnly
  const status = assistantStatus({ ready, planned, installPhase, t })
  const secondary = formatListSecondary(tool, t)
  const failLine = installPhase === "failed" && installError ? formatInstallFailLine(installError, t) : null
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
          ready ? "bg-background-secondary-default" : "border border-dashed border-border-button-default"
        }`}
      >
        <AgentBrandIcon id={tool.id} size={16} />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-caption-1-semibold text-text-primary">{tool.label}</p>
          {tool.homeSynced ? (
            <span className="rounded bg-accent-500/10 px-1 text-caption-2-medium text-accent-600">
              {t("settings.agentTools.listSynced")}
            </span>
          ) : null}
          <span className={`size-1.5 shrink-0 rounded-full ${status.dotClass}`} />
          <span className={`shrink-0 text-caption-2-medium ${status.textClass}`}>{status.label}</span>
        </div>
        <p className="truncate font-mono text-caption-2-regular text-text-tertiary" title={secondary}>
          {secondary}
        </p>
        {installPhase === "installing" ? (
          <p className="mt-0.5 truncate text-caption-2-regular text-text-tertiary">
            {t("settings.agentTools.installingHint")}
          </p>
        ) : null}
        {failLine ? (
          <p className="mt-0.5 truncate text-caption-2-regular text-text-error-primary" title={failLine}>
            {failLine}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function assistantStatus(input: {
  ready: boolean
  planned: boolean
  installPhase: InstallRowPhase
  t: (key: string) => string
}): { label: string; dotClass: string; textClass: string } {
  const { ready, planned, installPhase, t } = input
  if (installPhase === "installing") {
    return {
      label: t("settings.agentTools.installingStatus"),
      dotClass: "bg-accent-500 animate-pulse",
      textClass: "text-accent-600"
    }
  }
  if (installPhase === "failed") {
    return {
      label: t("settings.agentTools.installFailed"),
      dotClass: "bg-text-error-primary",
      textClass: "text-text-error-primary"
    }
  }
  if (ready) {
    return {
      label: t("settings.agentTools.statusReady"),
      dotClass: "bg-notification-success-foreground",
      textClass: "text-text-tertiary"
    }
  }
  if (planned) {
    return {
      label: t("settings.agentTools.filterSoon"),
      dotClass: "bg-text-tertiary",
      textClass: "text-text-tertiary"
    }
  }
  return {
    label: t("settings.agentTools.statusMissing"),
    dotClass: "bg-state-warning-text",
    textClass: "text-state-warning-text"
  }
}
