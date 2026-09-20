/**
 * 扩展发现壳：H 两列已配置入口 + 同页 I2 精选写入 Enjoy SoT。
 * 权威仍是 #/mcp 与 #/skills；不弹第二套表单、不新 IPC、不混 Registry。
 */
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { McpServer, SkillSource } from "@enjoy-agents/ipc-contract"
import { SKILL_SOURCES_OVERVIEW_QUERY_KEY } from "@renderer/components/skills/lib/git-skill-sources"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { CuratedSection } from "./curated/curated-section.tsx"
import { EXTENSIONS_COPY } from "./extensions-copy.ts"
import { mcpHubHref, skillsHubHref } from "./extensions-hrefs.ts"
import { configuredNames } from "./extensions-written.ts"
import { ExtensionsColumn } from "./extensions-column.tsx"
import type { ExtensionsColumnModel } from "./extensions.types.ts"

type SkillsOverview = { installedCount?: number; sources?: SkillSource[] }

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
    queryFn: () => getIde().skills.sources.overview() as Promise<SkillsOverview>
  })

  const servers = mcpQuery.data ?? []
  const sources = skillsQuery.data?.sources ?? []
  const mcpCount = servers.length
  const skillCount = skillsQuery.data?.installedCount ?? sources.length

  const columns = useMemo<ExtensionsColumnModel[]>(() => {
    return [
      {
        id: "mcp",
        title: t(EXTENSIONS_COPY.mcpTitle),
        countLabel: t(EXTENSIONS_COPY.configured, { count: mcpCount }),
        addHref: mcpHubHref(),
        addLabel: t(EXTENSIONS_COPY.add),
        configured: configuredNames(servers)
      },
      {
        id: "skills",
        title: t(EXTENSIONS_COPY.skillsTitle),
        countLabel: t(EXTENSIONS_COPY.configured, { count: skillCount }),
        addHref: skillsHubHref(),
        addLabel: t(EXTENSIONS_COPY.add),
        configured: configuredNames(sources)
      }
    ]
  }, [mcpCount, servers, skillCount, sources, t])

  return (
    <div data-testid="page-extensions" className="relative flex flex-col gap-4 pb-8">
      <div className="rounded-2xl border border-separator-border bg-background-primary-default p-4">
        <h1 className="text-title-3-semibold text-text-primary">{t(EXTENSIONS_COPY.title)}</h1>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t(EXTENSIONS_COPY.desc)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {columns.map((column) => (
          <ExtensionsColumn key={column.id} column={column} />
        ))}
      </div>

      <CuratedSection servers={servers} sources={sources} />

      <p className="text-caption-2-regular text-text-tertiary">{t(EXTENSIONS_COPY.footnote)}</p>
    </div>
  )
}
