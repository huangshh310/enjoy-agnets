/**
 * Settings → 智能体：本机 CLI 紧凑表（助手 / 动力源 / 操作）。
 */
import { useEffect, useMemo, useState } from "react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { RiSearchLine } from "@remixicon/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useT } from "@renderer/i18n"
import { agentToolCardId } from "./agent-tool-anchor"
import { AgentToolRow } from "./agent-tool-row"
import { AgentToolsEmpty } from "./agent-tools-empty"

type FilterTab = "all" | "ready" | "available" | "soon"

export function AgentToolsPage({ focus }: { focus?: { id: string; at: number } | null }) {
  const t = useT()
  const queryClient = useQueryClient()
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
  }, [queryClient])
  useEffect(() => {
    if (!focus) return
    setActiveTab("all")
    setSearchQuery("")
    const timer = window.setTimeout(() => {
      document.getElementById(agentToolCardId(focus.id))?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 40)
    return () => window.clearTimeout(timer)
  }, [focus])
  const readyCount = useMemo(
    () => tools.filter((item) => item.status === "ready" || item.id === DEFAULT_RUNTIME_ID).length,
    [tools]
  )
  const availableCount = useMemo(
    () => tools.filter((item) => item.status === "missing" && !item.comingSoon && !item.skillOnly).length,
    [tools]
  )
  const soonCount = useMemo(
    () => tools.filter((item) => item.comingSoon || item.skillOnly).length,
    [tools]
  )
  const filteredTools = useMemo(
    () => tools.filter((tool) => matchTool(tool, activeTab, searchQuery)),
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
            className="h-8 w-40 rounded-xl border border-border-button-default bg-background-primary-default pr-2.5 pl-8 text-caption-1-medium text-text-primary shadow-2xs outline-none placeholder:text-text-tertiary hover:border-border-button-hover focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
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
        <div className="overflow-hidden rounded-2xl border border-border-button-default">
          <div className="grid grid-cols-[1.2fr_1.6fr_auto] gap-3 border-b border-separator-border bg-background-secondary-default/50 px-4 py-2 text-caption-2-medium font-semibold tracking-wide text-text-tertiary uppercase">
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

function matchTool(tool: AgentToolPublic, tab: FilterTab, searchQuery: string): boolean {
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    if (!tool.label.toLowerCase().includes(query) && !tool.id.toLowerCase().includes(query)) return false
  }
  if (tab === "ready") return tool.status === "ready" || tool.id === DEFAULT_RUNTIME_ID
  if (tab === "available") return tool.status === "missing" && !tool.comingSoon && !tool.skillOnly
  if (tab === "soon") return tool.comingSoon || tool.skillOnly
  return true
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
