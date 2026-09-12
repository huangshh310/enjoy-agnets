/**
 * 配置抽屉：登录入口。体检已上移到顶栏信任卡，这里不再堆 doctor 条。
 */
import { RiLoginBoxLine } from "@remixicon/react"
import { classifyPowerSource, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { AgentToolOmpLogin } from "./agent-tool-omp-login"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolConfigOps({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  if (tool.id === "omp") return <AgentToolOmpLogin tool={tool} actions={actions} />
  if (classifyPowerSource(tool.id) === "official") return null
  return (
    <div className="flex items-center justify-between rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={actions.busyAction === "login"}
        onClick={() => void actions.runLogin()}
        className="gap-1.5 text-caption-1-medium"
      >
        <RiLoginBoxLine className="size-3.5 text-text-tertiary" />
        {actions.busyAction === "login" ? t("settings.agentTools.loggingIn") : t("settings.agentTools.login")}
      </Button>
    </div>
  )
}
