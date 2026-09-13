/**
 * 扩展与能力中心页面：
 * 聚合呈现 MCP 外部服务协议与智能体技能套件生态。
 * 具备三联生态指标磁贴、分类筛选、即时搜索与现代 Bento 卡片集市。
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RiApps2Line, RiRefreshLine, RiSearch2Line } from "@remixicon/react"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { getFeaturedMcpPresets } from "@renderer/components/mcp/constants/mcp-presets"
import { CURATED_SKILL_SOURCES } from "@renderer/components/skills/constants/skills-curated.constants"
import { SKILL_SOURCES_OVERVIEW_QUERY_KEY } from "@renderer/components/skills/lib/git-skill-sources"
import { SettingsHub } from "@renderer/components/settings/settings-hub"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { projectMcpCurated, projectSkillsCurated } from "./extensions-curated.ts"
import { ExtensionsKpiBanner } from "./extensions-kpi-banner.tsx"
import { ExtensionsToolbar } from "./extensions-toolbar.tsx"
import { ExtensionCard } from "./extension-card.tsx"
import type { ExtensionsCategoryFilter, ExtensionsFilterTab } from "./extensions.types.ts"

export function ExtensionsPage() {
  const t = useT()
  const [activeTab, setActiveTab] = useState<ExtensionsFilterTab>("all")
  const [activeCategory, setActiveCategory] = useState<ExtensionsCategoryFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const mcpQuery = useQuery({
    queryKey: ["mcp"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })

  const skillsQuery = useQuery({
    queryKey: SKILL_SOURCES_OVERVIEW_QUERY_KEY,
    enabled: hasIde(),
    queryFn: () => getIde().skills.sources.overview() as Promise<{ installedCount?: number; sources?: unknown[] }>
  })

  const configuredMcpIds = useMemo(() => {
    return new Set(mcpQuery.data?.map((s) => s.id) ?? [])
  }, [mcpQuery.data])

  const mcpCount = mcpQuery.data?.length ?? 0
  const skillCount = skillsQuery.data?.installedCount ?? skillsQuery.data?.sources?.length ?? 0

  const mcpCards = useMemo(() => {
    return projectMcpCurated(getFeaturedMcpPresets(t), configuredMcpIds)
  }, [t, configuredMcpIds])

  const skillCards = useMemo(() => {
    return projectSkillsCurated(CURATED_SKILL_SOURCES)
  }, [])

  const allCards = useMemo(() => {
    return [...mcpCards, ...skillCards]
  }, [mcpCards, skillCards])

  // 多重响应式过滤
  const filteredCards = useMemo(() => {
    let result = allCards

    // 1. 主 Tab 过滤
    if (activeTab === "mcp") {
      result = mcpCards
    } else if (activeTab === "skills") {
      result = skillCards
    }

    // 2. 分类过滤
    if (activeCategory !== "all") {
      result = result.filter((card) => card.category === activeCategory)
    }

    // 3. 搜索过滤
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((card) => {
        return (
          card.title.toLowerCase().includes(q) ||
          card.description.toLowerCase().includes(q) ||
          (card.category && card.category.toLowerCase().includes(q)) ||
          (card.categoryLabel && card.categoryLabel.toLowerCase().includes(q)) ||
          (card.author && card.author.toLowerCase().includes(q)) ||
          (card.sampleTools && card.sampleTools.some((t) => t.toLowerCase().includes(q))) ||
          (card.tags && card.tags.some((tag) => tag.toLowerCase().includes(q)))
        )
      })
    }

    return result
  }, [allCards, mcpCards, skillCards, activeTab, activeCategory, searchQuery])

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* 1. 顶部 Header 枢纽 */}
      <SettingsHub
        icon={RiApps2Line}
        title={t("settings.extensions.hubTitle")}
        badge={t("settings.extensions.hubBadge")}
        description={t("settings.extensions.hubDesc")}
      />

      {/* 2. 三联生态态势概览磁贴 */}
      <ExtensionsKpiBanner
        mcpCount={mcpCount}
        skillCount={skillCount}
        totalCuratedCount={allCards.length}
      />

      {/* 3. 交互筛选与搜索工具栏 */}
      <ExtensionsToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        mcpCount={mcpCards.length}
        skillCount={skillCards.length}
        totalCount={allCards.length}
      />

      {/* 4. 响应式 Bento 网格列表 */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((card) => (
            <ExtensionCard key={`${card.kind}-${card.id}`} card={card} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-separator-border/80 bg-background-primary-default/50 py-16 text-center shadow-card">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-separator-border/60 bg-background-secondary-default text-text-tertiary">
            <RiSearch2Line className="size-6" />
          </div>
          <h3 className="mt-3 text-body-medium font-semibold text-text-primary">
            {t("settings.extensions.emptySearchTitle")}
          </h3>
          <p className="mt-1 text-caption-2-regular text-text-tertiary">
            {t("settings.extensions.emptySearchDesc")}
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab("all")
              setActiveCategory("all")
              setSearchQuery("")
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-secondary-default px-3 py-1.5 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            <RiRefreshLine className="size-3.5" />
            <span>重置所有筛选</span>
          </button>
        </div>
      )}

      {/* 5. 底部生态兼容说明 */}
      <div className="flex items-center justify-between border-t border-separator-border/50 pt-4 text-caption-2-regular text-text-tertiary">
        <span>{t("settings.extensions.footnote")}</span>
        <span className="font-mono text-[11px]">Enjoy Agent Capabilities Ecosystem</span>
      </div>
    </div>
  )
}
