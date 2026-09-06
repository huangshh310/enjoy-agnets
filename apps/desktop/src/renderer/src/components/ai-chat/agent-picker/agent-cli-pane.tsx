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
          <AgentCliModels agent={agent} onPick={(model) => onUse(model)} />

          {/* 底部状态注脚 (与 Enjoy 本地保持一致的简洁质感) */}
          <div className="flex items-center justify-between border-t border-separator-border bg-background-secondary-default/40 px-3.5 py-2 text-[11px] text-text-tertiary">
            <div className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] truncate">
              <span className="text-text-tertiary">源:</span>
              <span className="truncate text-text-secondary" title={agent.detectedPath ?? "系统全局 PATH"}>
                {agent.detectedPath ? agent.detectedPath.split("/").slice(-2).join("/") : "系统全局 PATH"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-tertiary">
              <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
              <span className="text-caption-2-medium text-accent-600">ACP Stdio</span>
            </div>
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
