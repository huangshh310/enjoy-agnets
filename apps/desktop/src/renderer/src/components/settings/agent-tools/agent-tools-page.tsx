/**
 * Settings → 智能体：本机 CLI 工具箱动力机架。
 * 支持按就绪状态、安装状态筛选与快速检索。
 */
import { useMemo, useState } from "react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { RiSearchLine, RiFilter3Line } from "@remixicon/react"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { AgentToolCard } from "./agent-tool-card"

type FilterTab = "all" | "ready" | "available" | "soon"

export function AgentToolsPage() {
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // 分类统计
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

  // 过滤后的智能体列表
  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      // 搜索词过滤
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchLabel = tool.label.toLowerCase().includes(query)
        const matchId = tool.id.toLowerCase().includes(query)
        if (!matchLabel && !matchId) return false
      }

      // Tab 过滤
      if (activeTab === "ready") {
        return tool.status === "ready" || tool.id === DEFAULT_RUNTIME_ID
      }
      if (activeTab === "available") {
        return tool.status === "missing" && !tool.comingSoon && !tool.skillOnly
      }
      if (activeTab === "soon") {
        return tool.comingSoon || tool.skillOnly
      }
      return true
    })
  }, [tools, activeTab, searchQuery])

  return (
    <section className="flex flex-col gap-4">
      {/* 栏目标题与过滤器 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-body-medium font-semibold text-text-primary">引擎机架矩阵 (Engine Racks)</h3>
          <p className="mt-0.5 text-caption-1-regular text-text-secondary">
            可自主插拔的编码动力内核。支持本地沙箱环境、ACP 协议直连与官方 CLI 进程管理。
          </p>
        </div>

        {/* 搜索与过滤工具条 */}
        <div className="flex items-center gap-2">
          {/* 搜索框 */}
          <div className="relative flex items-center">
            <RiSearchLine className="pointer-events-none absolute left-2.5 size-3.5 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="快速检索引擎..."
              className="h-8 w-44 rounded-xl border border-border-button-default bg-background-primary-default pl-8 pr-2.5 text-caption-1-medium text-text-primary shadow-2xs outline-none transition-all placeholder:text-text-tertiary hover:border-border-button-hover focus:w-56 focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
            />
          </div>
        </div>
      </div>

      {/* 状态分类切换器 (Pill Tabs) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-separator-border pb-2">
        <FilterTabButton
          label="全部引擎"
          count={tools.length}
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
        />
        <FilterTabButton
          label="已就绪核心"
          count={readyCount}
          active={activeTab === "ready"}
          badgeColor="text-accent-600 bg-accent-500/10"
          onClick={() => setActiveTab("ready")}
        />
        <FilterTabButton
          label="待装载"
          count={availableCount}
          active={activeTab === "available"}
          badgeColor="text-amber-600 dark:text-amber-400 bg-amber-500/10"
          onClick={() => setActiveTab("available")}
        />
        <FilterTabButton
          label="规划与技能"
          count={soonCount}
          active={activeTab === "soon"}
          onClick={() => setActiveTab("soon")}
        />
      </div>

      {/* 引擎机架卡片列表 */}
      <div className="grid gap-3.5">
        {filteredTools.map((tool: AgentToolPublic) => (
          <AgentToolCard key={tool.id} tool={tool} />
        ))}

        {filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default py-12 text-center">
            <RiFilter3Line className="size-8 text-text-tertiary" />
            <p className="mt-2 text-body-medium font-medium text-text-primary">未找到匹配的智能体引擎</p>
            <p className="mt-1 text-caption-1-regular text-text-secondary">
              请尝试清除搜索关键词或切换到“全部引擎”筛选。
            </p>
          </div>
        ) : null}
      </div>

      {/* 底部环境提示注脚 */}
      <div className="mt-2 flex items-center justify-between rounded-xl bg-background-secondary-default/40 px-3.5 py-2.5 text-caption-2-medium text-text-tertiary">
        <span>
          💡 提示：Enjoy 会自动探测 <code className="font-mono text-text-secondary">/opt/homebrew/bin</code>、
          <code className="font-mono text-text-secondary">/usr/local/bin</code> 及{" "}
          <code className="font-mono text-text-secondary">~/.local/bin</code>。
        </span>
        <span className="font-mono">ACP Stdio Transport</span>
      </div>
    </section>
  )
}

function FilterTabButton({
  label,
  count,
  active,
  badgeColor = "text-text-secondary bg-background-secondary-default",
  onClick
}: {
  label: string
  count: number
  active: boolean
  badgeColor?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-caption-1-medium transition-all ${
        active
          ? "bg-background-primary-default font-semibold text-text-primary shadow-xs ring-1 ring-border-button-default"
          : "text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-md px-1.5 py-0.2 font-mono text-[10px] ${badgeColor}`}>
        {count}
      </span>
    </button>
  )
}
