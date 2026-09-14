/**
 * 统一扩展与插件中心模块页面：
 * 聚合“发现集市 (Marketplace)”、“MCP 协议服务 (MCP)”、“Agent 技能 (Skills)”与“JSON 规格”。
 * 作为第一级工作区常驻主航道，全屏沉浸，双向状态联动。
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiFileCodeLine, RiSparklingLine, RiStore2Line } from "@remixicon/react"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell, type SecondaryNavGroup } from "@renderer/components/app-pages/secondary-page-shell"
import { McpIcon } from "@renderer/components/mcp/components/mcp-brand-icons.ts"
import { McpJsonEditorView } from "@renderer/components/mcp/components/mcp-json-editor-view"
import { McpPage } from "@renderer/components/mcp/mcp-page"
import { SkillsPage } from "@renderer/components/skills/skills-page"
import { SKILL_SOURCES_OVERVIEW_QUERY_KEY } from "@renderer/components/skills/lib/git-skill-sources"
import { ExtensionsPage } from "@renderer/components/settings/extensions/extensions-page"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { parseExtensionsSearch, type ExtensionsRouteTab } from "./lib/extensions-route-search"

export function ExtensionsModulePage() {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>
  const parsedSearch = parseExtensionsSearch(rawSearch)

  const [activeTab, setActiveTab] = useState<ExtensionsRouteTab>(parsedSearch.tab ?? "marketplace")

  useEffect(() => {
    if (parsedSearch.tab && parsedSearch.tab !== activeTab) {
      setActiveTab(parsedSearch.tab)
    }
  }, [parsedSearch.tab, activeTab])

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

  const mcpServers = mcpQuery.data ?? []
  const mcpCount = mcpServers.length
  const skillCount = skillsQuery.data?.installedCount ?? skillsQuery.data?.sources?.length ?? 0

  function handleSelectTab(tabId: string) {
    const nextTab = (tabId === "marketplace" || tabId === "mcp" || tabId === "skills" || tabId === "json")
      ? (tabId as ExtensionsRouteTab)
      : "marketplace"

    setActiveTab(nextTab)
    void navigate({
      to: "/extensions",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        tab: nextTab
      })
    })
  }

  const navGroups: SecondaryNavGroup[] = useMemo(
    () => [
      {
        id: "explore",
        label: t("pages.extensions.groupExplore"),
        items: [
          {
            id: "marketplace",
            label: t("pages.extensions.marketplace"),
            icon: RiStore2Line,
            meta: "32+",
            keywords: ["market", "marketplace", "store", "集市", "发现", "扩展", "推荐", "生态"]
          }
        ]
      },
      {
        id: "installed",
        label: t("pages.extensions.groupInstalled"),
        items: [
          {
            id: "mcp",
            label: t("pages.extensions.mcpServers"),
            icon: McpIcon,
            meta: mcpCount > 0 ? String(mcpCount) : undefined,
            keywords: ["mcp", "servers", "tools", "服务", "协议", "工具"]
          },
          {
            id: "skills",
            label: t("pages.extensions.skills"),
            icon: RiSparklingLine,
            meta: skillCount > 0 ? String(skillCount) : undefined,
            keywords: ["skills", "skill", "能力", "技能", "agent"]
          }
        ]
      },
      {
        id: "advanced",
        label: t("pages.extensions.groupAdvanced"),
        items: [
          {
            id: "json",
            label: t("pages.extensions.jsonConfig"),
            icon: RiFileCodeLine,
            keywords: ["json", "config", "spec", "规格", "配置"]
          }
        ]
      }
    ],
    [mcpCount, skillCount, t]
  )

  async function handleRefreshMcp() {
    await queryClient.invalidateQueries({ queryKey: ["mcp"] })
  }

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.extensions.filterPlaceholder")}
      groups={navGroups}
      selectedId={activeTab}
      onSelect={handleSelectTab}
      contentWidth="fill"
      hideChrome
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        {activeTab === "marketplace" ? (
          <div className="h-full min-h-0 flex-1 overflow-y-auto px-8 pt-5 pb-8">
            <ExtensionsPage />
          </div>
        ) : null}

        {activeTab === "mcp" ? (
          <McpPage
            embedded
            onBrowseMarketplace={() => handleSelectTab("marketplace")}
          />
        ) : null}

        {activeTab === "skills" ? (
          <SkillsPage embedded />
        ) : null}

        {activeTab === "json" ? (
          <div className="flex h-full min-h-0 flex-1 flex-col px-8 pt-5 pb-6">
            <McpJsonEditorView
              servers={mcpServers}
              onChanged={handleRefreshMcp}
            />
          </div>
        ) : null}
      </div>
    </SecondaryPageShell>
  )
}
