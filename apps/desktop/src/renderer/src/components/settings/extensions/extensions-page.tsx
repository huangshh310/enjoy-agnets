/**
 * 扩展发现壳：设置「工作区与扩展」一页两列 MCP | Skills。
 * 权威配置仍是 #/mcp 与 #/skills；本页只做入口，不弹第二套表单、不新 IPC。
 */
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { getFeaturedMcpPresets } from "@renderer/components/mcp/constants/mcp-presets"
import { CURATED_SKILL_SOURCES } from "@renderer/components/skills/constants/skills-curated.constants"
import { SKILL_SOURCES_OVERVIEW_QUERY_KEY } from "@renderer/components/skills/lib/git-skill-sources"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { EXTENSIONS_HUB_MCP_IDS, EXTENSIONS_HUB_SKILL_IDS } from "./constants.ts"
import { EXTENSIONS_COPY } from "./extensions-copy.ts"
import { pickByIds, projectMcpCurated, projectSkillsCurated } from "./extensions-curated.ts"
import { mcpHubHref, skillsHubHref } from "./extensions-hrefs.ts"
import { ExtensionsColumn } from "./extensions-column.tsx"
import type { ExtensionsColumnModel } from "./extensions.types.ts"

export function ExtensionsPage() {
  const t = useT()

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

  const mcpCount = mcpQuery.data?.length ?? 0
  const skillCount = skillsQuery.data?.installedCount ?? skillsQuery.data?.sources?.length ?? 0

  const columns = useMemo<ExtensionsColumnModel[]>(() => {
    return [
      {
        id: "mcp",
        title: t(EXTENSIONS_COPY.mcpTitle),
        countLabel: t(EXTENSIONS_COPY.configured, { count: mcpCount }),
        addHref: mcpHubHref(),
        addLabel: t(EXTENSIONS_COPY.add),
        cards: projectMcpCurated(pickByIds(getFeaturedMcpPresets(t), EXTENSIONS_HUB_MCP_IDS))
      },
      {
        id: "skills",
        title: t(EXTENSIONS_COPY.skillsTitle),
        countLabel: t(EXTENSIONS_COPY.configured, { count: skillCount }),
        addHref: skillsHubHref(),
        addLabel: t(EXTENSIONS_COPY.add),
        cards: projectSkillsCurated(pickByIds(CURATED_SKILL_SOURCES, EXTENSIONS_HUB_SKILL_IDS))
      }
    ]
  }, [mcpCount, skillCount, t])

  return (
    <div data-testid="page-extensions" className="flex flex-col gap-4 pb-8">
      <div className="rounded-2xl border border-separator-border bg-background-primary-default p-4">
        <h1 className="text-title-3-semibold text-text-primary">{t(EXTENSIONS_COPY.title)}</h1>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t(EXTENSIONS_COPY.desc)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {columns.map((column) => (
          <ExtensionsColumn key={column.id} column={column} />
        ))}
      </div>

      <p className="text-caption-2-regular text-text-tertiary">{t(EXTENSIONS_COPY.footnote)}</p>
    </div>
  )
}
