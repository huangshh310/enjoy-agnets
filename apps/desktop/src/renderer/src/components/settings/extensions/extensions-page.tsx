/**
 * 扩展与能力中心页面：
 * 聚合呈现 MCP 外部服务协议与智能体技能套件生态。
 * 具备三联生态指标磁贴、分类筛选、即时搜索、现代 Bento 卡片集市与自定义扩展添加能力。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAddLine,
  RiApps2Line,
  RiArrowDownSLine,
  RiArrowRightLine,
  RiCodeSSlashLine,
  RiCpuLine,
  RiFlashlightLine,
  RiRefreshLine,
  RiSearch2Line
} from "@remixicon/react"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { getFeaturedMcpPresets } from "@renderer/components/mcp/constants/mcp-presets"
import { McpCreateModal } from "@renderer/components/mcp/components/mcp-create-modal"
import { CURATED_SKILL_SOURCES } from "@renderer/components/skills/constants/skills-curated.constants"
import { ImportDialog } from "@renderer/components/skills/components/skills-import-dialog"
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
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ExtensionsFilterTab>("all")
  const [activeCategory, setActiveCategory] = useState<ExtensionsCategoryFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [createMcpOpen, setCreateMcpOpen] = useState(false)
  const [importSkillOpen, setImportSkillOpen] = useState(false)

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

  async function handleMcpChanged() {
    await queryClient.invalidateQueries({ queryKey: ["mcp"] })
  }

  async function handleSkillsChanged() {
    await queryClient.invalidateQueries({ queryKey: SKILL_SOURCES_OVERVIEW_QUERY_KEY })
  }

  function handleGoToMcpJson() {
    window.location.hash = "#/mcp?tab=json"
  }

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
      {/* 1. 顶部 Header 枢纽：增加符合规范的「+ 添加扩展」微型操作 */}
      <SettingsHub
        icon={RiApps2Line}
        title={t("settings.extensions.hubTitle")}
        badge={t("settings.extensions.hubBadge")}
        description={t("settings.extensions.hubDesc")}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border-button-default bg-background-primary-default px-3 text-caption-2-medium font-medium text-text-primary shadow-xs hover:bg-background-secondary-default hover:text-text-primary active:scale-98"
              >
                <RiAddLine className="size-3.5 text-accent-500" />
                <span>{t("settings.extensions.addExtension")}</span>
                <RiArrowDownSLine className="size-3 text-text-tertiary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-1.5">
              <DropdownMenuItem
                onClick={() => setCreateMcpOpen(true)}
                className="flex items-center gap-2.5 cursor-pointer py-2 px-2.5 rounded-lg"
              >
                <RiCpuLine className="size-4 text-accent-500 shrink-0" />
                <span className="text-caption-1-medium text-text-primary whitespace-nowrap">
                  {t("settings.extensions.addCustomMcp")}
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleGoToMcpJson}
                className="flex items-center gap-2.5 cursor-pointer py-2 px-2.5 rounded-lg"
              >
                <RiCodeSSlashLine className="size-4 text-accent-500 shrink-0" />
                <span className="text-caption-1-medium text-text-primary whitespace-nowrap">
                  {t("settings.extensions.importMcpJson")}
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setImportSkillOpen(true)}
                className="flex items-center gap-2.5 cursor-pointer py-2 px-2.5 rounded-lg"
              >
                <RiFlashlightLine className="size-4 text-accent-500 shrink-0" />
                <span className="text-caption-1-medium text-text-primary whitespace-nowrap">
                  {t("settings.extensions.importSkill")}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
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

          {/* 网格末尾的自定义添加引导卡 */}
          <article
            onClick={() => setCreateMcpOpen(true)}
            className="group relative flex flex-col justify-between rounded-2xl border border-dashed border-separator-border/90 bg-background-primary-default/50 p-5 transition-all duration-200 hover:border-accent-500/60 hover:bg-background-secondary-default/30 cursor-pointer"
          >
            <div>
              <div className="flex size-11 items-center justify-center rounded-xl border border-dashed border-border-button-default bg-background-secondary-default text-text-tertiary group-hover:border-accent-500/40 group-hover:text-accent-500 transition-colors">
                <RiAddLine className="size-5" />
              </div>
              <h3 className="mt-3.5 text-body-large-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                {t("settings.extensions.customCardTitle")}
              </h3>
              <p className="mt-2 text-caption-1-regular leading-relaxed text-text-tertiary">
                {t("settings.extensions.customCardDesc")}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-dashed border-separator-border/60 pt-3">
              <span className="text-[11px] font-mono text-text-tertiary">#自定义扩展</span>
              <span className="inline-flex items-center gap-1 text-caption-2-medium font-semibold text-accent-500 group-hover:underline">
                <span>{t("settings.extensions.customCardAction")}</span>
                <RiArrowRightLine className="size-3.5" />
              </span>
            </div>
          </article>
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("all")
                setActiveCategory("all")
                setSearchQuery("")
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-secondary-default px-3 py-1.5 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors cursor-pointer"
            >
              <RiRefreshLine className="size-3.5" />
              <span>重置所有筛选</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateMcpOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-3 py-1.5 text-caption-2-medium font-medium text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
            >
              <RiAddLine className="size-3.5 text-accent-500" />
              <span>{t("settings.extensions.addCustomMcp")}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. 底部生态兼容说明 */}
      <div className="flex items-center justify-between border-t border-separator-border/50 pt-4 text-caption-2-regular text-text-tertiary">
        <span>{t("settings.extensions.footnote")}</span>
        <span className="font-mono text-[11px]">Enjoy Agent Capabilities Ecosystem</span>
      </div>

      {/* 6. 模态抽屉 */}
      <McpCreateModal
        open={createMcpOpen}
        onOpenChange={setCreateMcpOpen}
        onChanged={handleMcpChanged}
      />

      <ImportDialog
        open={importSkillOpen}
        onOpenChange={setImportSkillOpen}
        onImported={handleSkillsChanged}
      />
    </div>
  )
}
