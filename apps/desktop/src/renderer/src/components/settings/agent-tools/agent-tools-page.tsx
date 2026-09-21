/**
 * Settings → 智能体：本机 CLI 紧凑表（助手 / 动力源 / 操作）。
 */
import { useEffect, useMemo, useState } from "react"
import { AgentToolInstallProgress as AgentToolInstallProgressEvent } from "@enjoy-agents/ipc-contract"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { RiSearchLine } from "@remixicon/react"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { agentToolCardId } from "./agent-tool-anchor"
import {
  countAgentToolsByTab,
  matchAgentTool,
  type AgentToolFilterTab
} from "./agent-tool-list-filter"
import { CLI_LIST_GRID } from "./list-layout"
import { AgentToolRow } from "./agent-tool-row"
import { AgentToolsEmpty } from "./agent-tools-empty"
import { applyInstallProgress } from "./install-progress-store"
import { getIde, hasIde } from "@renderer/lib/ide"

export function AgentToolsPage({ focus }: { focus?: { id: string; at: number } | null }) {
  const t = useT()
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const [activeTab, setActiveTab] = useState<AgentToolFilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  useEffect(() => {
    if (!hasIde()) return
    const off = getIde().agentTools.onInstallProgress?.((raw) => {
      const parsed = AgentToolInstallProgressEvent.safeParse(raw)
      if (parsed.success) applyInstallProgress(parsed.data)
    })
    return () => {
      off?.()
    }
  }, [])
  useEffect(() => {
    if (!focus) return
    setActiveTab("all")
    setSearchQuery("")
    const timer = window.setTimeout(() => {
      document.getElementById(agentToolCardId(focus.id))?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 40)
    return () => window.clearTimeout(timer)
  }, [focus])
  const readyCount = useMemo(() => countAgentToolsByTab(tools, "ready"), [tools])
  const availableCount = useMemo(() => countAgentToolsByTab(tools, "available"), [tools])
  const soonCount = useMemo(() => countAgentToolsByTab(tools, "soon"), [tools])
  const internationalCount = useMemo(() => countAgentToolsByTab(tools, "international"), [tools])
  const domesticCount = useMemo(() => countAgentToolsByTab(tools, "domestic"), [tools])
  const filteredTools = useMemo(
    () => tools.filter((tool) => matchAgentTool(tool, activeTab, searchQuery)),
    [tools, activeTab, searchQuery]
  )
  const emptyKind =
    filteredTools.length > 0
      ? null
      : activeTab === "available" && availableCount === 0 && !searchQuery.trim()
        ? "ready"
        : searchQuery.trim()
          ? "search"
          : "filter"

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-separator-border pb-2">
        <FilterTabButton label={t("settings.agentTools.filterAll")} count={tools.length} active={activeTab === "all"} onClick={() => setActiveTab("all")} />
        <FilterTabButton label={t("settings.agentTools.filterInternational")} count={internationalCount} active={activeTab === "international"} onClick={() => setActiveTab("international")} />
        <FilterTabButton label={t("settings.agentTools.filterDomestic")} count={domesticCount} active={activeTab === "domestic"} onClick={() => setActiveTab("domestic")} />
        <span className="mx-1 h-3 w-px bg-separator-border" aria-hidden />
        <FilterTabButton label={t("settings.agentTools.filterReady")} count={readyCount} active={activeTab === "ready"} onClick={() => setActiveTab("ready")} />
        <FilterTabButton label={t("settings.agentTools.filterMissing")} count={availableCount} active={activeTab === "available"} onClick={() => setActiveTab("available")} />
        <FilterTabButton label={t("settings.agentTools.filterSoon")} count={soonCount} active={activeTab === "soon"} onClick={() => setActiveTab("soon")} />
        <div className="relative ml-auto flex items-center">
          <RiSearchLine className="pointer-events-none absolute left-2.5 size-3.5 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("settings.agentTools.searchPlaceholder")}
            className="h-7 w-36 rounded-lg border border-border-button-default bg-background-primary-default pr-2.5 pl-8 text-caption-2-medium text-text-primary shadow-2xs outline-none placeholder:text-text-tertiary hover:border-border-button-hover focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </div>
      </div>
      {emptyKind ? (
        <AgentToolsEmpty
          kind={emptyKind}
          query={searchQuery}
          readyCount={readyCount}
          total={tools.length}
          onViewReady={() => setActiveTab("ready")}
          onViewAll={() => setActiveTab("all")}
          onClearSearch={() => setSearchQuery("")}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-button-default">
          <div className={`grid ${CLI_LIST_GRID} gap-x-3 border-b border-separator-border bg-background-secondary-default/50 px-3 py-1.5 text-caption-2-medium font-semibold tracking-wide text-text-tertiary uppercase`}>
            <span>{t("settings.agentTools.colAssistant")}</span>
            <span>{t("settings.agentTools.colPower")}</span>
            <span className="text-right">{t("settings.agentTools.colActions")}</span>
          </div>
          {filteredTools.map((tool: AgentToolPublic) => (
            <AgentToolRow key={tool.id} tool={tool} flash={focus?.id === tool.id} />
          ))}
        </div>
      )}
    </section>
  )
}

function FilterTabButton({
  label,
  count,
  active,
  onClick
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption-1-medium ${
        active
          ? "bg-accent-500/10 font-medium text-accent-600"
          : "text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
      }`}
    >
      <span>{label}</span>
      <span>{count}</span>
    </button>
  )
}
