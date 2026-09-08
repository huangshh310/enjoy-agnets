/**
 * CLI 引擎专属控制面板 (Agent CLI Dynamic HUD)
 * 极致紧凑、极客风格状态注脚，与 Enjoy 本地保持一致的简洁质感。
 */
import type { AgentCliModel, AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { RiCompass3Line } from "@remixicon/react"
import { canSwitchAgent } from "@renderer/lib/agent-runtime"
import { useT } from "@renderer/i18n"
import { AgentCliInstall } from "./agent-cli-install"
import { AgentCliModels } from "./agent-cli-models"

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 主体：模型列表或安装引导 */}
      {switchable ? (
        <>
          <AgentCliModels
            agent={agent}
            onPick={(model) => onUse(model)}
            onUseDefault={() => onUse()}
          />

          {/* 底部状态注脚：ACP 传输 + 一句说明 Fast/思考不进 argv */}
          <div className="border-t border-separator-border bg-background-secondary-default/40 px-3.5 py-2 text-caption-2-medium text-text-tertiary">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 truncate font-mono">
                <span>{t("chat.usage.source")}</span>
                <span className="truncate text-text-secondary" title={agent.detectedPath ?? t("settings.agentTools.globalPath")}>
                  {agent.detectedPath ? agent.detectedPath.split("/").slice(-2).join("/") : t("settings.agentTools.globalPath")}
                </span>
              </div>
              <span className="shrink-0 text-caption-2-medium text-text-secondary">{t("chat.usage.acpSubscribe")}</span>
            </div>
            <p className="mt-1 truncate text-caption-2-medium text-text-tertiary" title={t("chat.cliFastViaModel")}>
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
