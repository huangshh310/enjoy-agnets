/**
 * 导轨单引擎：名称 + 就绪胶囊。就绪不写字；禁止协议/登录标签。
 */
import { useEffect, useRef } from "react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "./agent-brand-icon"
import { useCliLoginLoop } from "./cli-login-loop"
import { engineReadiness, isEngineLit, readinessMarkKey, readinessSubtitle } from "./engine-readiness"
import { readinessInputOf } from "./engine-readiness-input"
import { ReadinessMark } from "./readiness-mark"
import { useEngineFace } from "@renderer/hooks/use-engine-display-name"

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
  const hasKey = useChatStore((state) => state.hasKey)
  const loop = useCliLoginLoop(agent.id)
  const input = readinessInputOf(agent, { hasKey, loginLoop: loop.phase })
  const ready = isEngineLit(input)
  const kind = engineReadiness(input)
  const markKey = readinessMarkKey(kind)
  const subtitle = readinessSubtitle(kind, t)
  const { face, trueNameTitle } = useEngineFace(agent.id, agent.label)

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
      title={subtitle ? `${trueNameTitle} · ${subtitle}` : trueNameTitle}
      onClick={onSelect}
      className={`group relative flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-caption-1-medium transition-all duration-150 outline-none select-none ${
        isSelected
          ? "bg-background-primary-default text-text-primary shadow-xs ring-1 ring-border-button-default"
          : "text-text-secondary hover:bg-background-primary-default/60 hover:text-text-primary"
      }`}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        <AgentBrandIcon id={agent.id} size={14} />
      </span>
      <span className="whitespace-nowrap">{face}</span>
      {markKey ? <ReadinessMark kind={kind} label={t(markKey)} /> : null}
      {isCurrent && ready ? (
        <span className="size-1.5 shrink-0 rounded-full bg-accent-500 shadow-2xs" title={t("chat.agentReady")} />
      ) : null}
    </button>
  )
}
