/**
 * 配置抽屉决策槽：永远叫「这个助手用」。按能力分支，不按品牌特判。
 */
import type { ReactNode } from "react"
import { classifyPowerSource, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { AgentToolProvider } from "../agent-tool-provider"
import type { AgentToolActions } from "../use-agent-tool-actions"
import { EnjoyPowerSlot } from "./enjoy-power-slot"
import { OfficialPowerSlot } from "./official-power-slot"
import { OmpPowerSlot } from "./omp-power-slot"

export function AgentToolPowerSlot({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const kind = classifyPowerSource(tool.id)
  if (kind === "bindable") {
    return <AgentToolProvider tool={tool} actions={actions} />
  }
  return (
    <PowerSlotShell>
      {kind === "enjoy-vault" ? <EnjoyPowerSlot /> : null}
      {kind === "official" ? <OfficialPowerSlot tool={tool} actions={actions} /> : null}
      {kind === "omp" ? <OmpPowerSlot tool={tool} actions={actions} /> : null}
    </PowerSlotShell>
  )
}

function PowerSlotShell({ children }: { children: ReactNode }) {
  const t = useT()
  return (
    <section className="flex flex-col gap-2.5">
      <h4 className="text-body-medium font-semibold text-text-primary">
        {t("settings.agentTools.providerMode")}
      </h4>
      {children}
    </section>
  )
}
