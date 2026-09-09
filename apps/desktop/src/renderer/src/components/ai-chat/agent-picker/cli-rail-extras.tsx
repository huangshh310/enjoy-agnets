/**
 * 导轨溢出：未安装 / 即将推出默认收起，点「未安装 N」才展开。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { EngineRailTab } from "./engine-rail-tab"

export function CliRailExtras({
  extras,
  missingCount,
  expanded,
  onToggle,
  selectedId,
  currentId,
  onSelect
}: {
  extras: AgentToolPublic[]
  missingCount: number
  expanded: boolean
  onToggle: () => void
  selectedId: string
  currentId: string
  onSelect: (id: string) => void
}) {
  const t = useT()
  if (extras.length === 0) return null
  const allMissing = missingCount === extras.length
  return (
    <>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={t("chat.railShowMissing")}
        onClick={onToggle}
        className="shrink-0 rounded-lg px-2 py-1 text-caption-2-medium text-text-tertiary outline-none hover:bg-background-primary-default/60 hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        {allMissing
          ? t("chat.railMissingCount", { n: extras.length })
          : missingCount === 0
            ? t("chat.railSoonCount", { n: extras.length })
            : t("chat.railMoreCount", { n: extras.length })}
      </button>
      {expanded
        ? extras.map((agent) => (
            <EngineRailTab
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedId}
              isCurrent={agent.id === currentId}
              onSelect={() => onSelect(agent.id)}
            />
          ))
        : null}
    </>
  )
}
