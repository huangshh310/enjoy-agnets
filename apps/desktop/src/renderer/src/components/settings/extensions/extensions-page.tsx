/**
 * 发现壳，权威配置仍是 #/mcp 与 #/skills。
 * 两列只读聚合现有精选；禁止第二套安装内核或新 IPC。
 */
import { useQuery } from "@tanstack/react-query"
import { RiApps2Line } from "@remixicon/react"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { getFeaturedMcpPresets } from "@renderer/components/mcp/constants/mcp-presets"
import { CURATED_SKILL_SOURCES } from "@renderer/components/skills/constants/skills-curated.constants"
import { SKILL_SOURCES_OVERVIEW_QUERY_KEY } from "@renderer/components/skills/lib/git-skill-sources"
import { SettingsHub } from "@renderer/components/settings/settings-hub"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { projectMcpCurated, projectSkillsCurated } from "./extensions-curated.ts"
import { ExtensionsColumn } from "./extensions-column.tsx"
import { mcpHubHref, skillsHubHref } from "./extensions-hrefs.ts"
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
  const columns = buildExtensionColumns(t, mcpCount, skillCount)

  return (
    <div className="flex flex-col gap-6">
      <SettingsHub
        icon={RiApps2Line}
        title={t("settings.extensions.hubTitle")}
        badge={t("settings.extensions.hubBadge")}
        description={t("settings.extensions.hubDesc")}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {columns.map((column) => (
          <ExtensionsColumn key={column.id} column={column} />
        ))}
      </div>
      <p className="text-caption-2-regular text-text-tertiary">{t("settings.extensions.footnote")}</p>
    </div>
  )
}

function buildExtensionColumns(
  t: ReturnType<typeof useT>,
  mcpCount: number,
  skillCount: number
): ExtensionsColumnModel[] {
  return [
    {
      id: "mcp",
      title: t("settings.extensions.mcpTitle"),
      countLabel: t("settings.extensions.configured", { count: mcpCount }),
      addHref: mcpHubHref(),
      addLabel: t("settings.extensions.add"),
      cards: projectMcpCurated(getFeaturedMcpPresets(t))
    },
    {
      id: "skills",
      title: t("settings.extensions.skillsTitle"),
      countLabel: t("settings.extensions.configured", { count: skillCount }),
      addHref: skillsHubHref(),
      addLabel: t("settings.extensions.add"),
      cards: projectSkillsCurated(CURATED_SKILL_SOURCES)
    }
  ]
}
