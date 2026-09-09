/**
 * 导轨单引擎：名称 + 就绪副标题。就绪可空；禁止协议/登录标签。
 */
import { useEffect, useRef } from "react"
import { capabilitiesOf, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { isEngineReady } from "@renderer/lib/agent-runtime"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "./agent-brand-icon"
import { engineReadiness, readinessSubtitle } from "./engine-readiness"

export function EngineRailTab({
  agent,
  isSelected,
  isCurrent,
  onSelect
}: {
  agent: AgentToolPublic
  isSelected: boolean
  isCurrent: boolean
  onSelect: () => void
}) {
  const t = useT()
  const itemRef = useRef<HTMLButtonElement>(null)
  const ready = isEngineReady(agent)
  const dimmed = agent.status === "missing" || agent.comingSoon
  const kind = engineReadiness({
    id: agent.id,
    status: agent.status,
    comingSoon: agent.comingSoon,
    requiresLogin: capabilitiesOf(agent).login,
    loggedIn: agent.authAccount?.loggedIn ?? null
  })
  const subtitle = readinessSubtitle(kind, t)

  useEffect(() => {
    if (isSelected) {
      itemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [isSelected])

  return (
    <button
      ref={itemRef}
      type="button"
      role="tab"
      aria-selected={isSelected}
      title={subtitle ? `${agent.label} · ${subtitle}` : agent.label}
      onClick={onSelect}
      className={`group relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-caption-1-medium transition-all duration-150 outline-none select-none ${
        isSelected
          ? "bg-background-primary-default font-semibold text-text-primary shadow-xs ring-1 ring-border-button-default"
          : "text-text-secondary hover:bg-background-primary-default/60 hover:text-text-primary"
      } ${dimmed ? "opacity-50" : ""}`}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        <AgentBrandIcon id={agent.id} size={14} />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="whitespace-nowrap">{agent.label}</span>
        {subtitle ? (
          <span className="whitespace-nowrap text-caption-2-medium text-text-tertiary">{subtitle}</span>
        ) : null}
      </span>
      {isCurrent && ready ? (
        <span className="size-1.5 shrink-0 rounded-full bg-accent-500 shadow-2xs" title={t("chat.agentReady")} />
      ) : null}
    </button>
  )
}
