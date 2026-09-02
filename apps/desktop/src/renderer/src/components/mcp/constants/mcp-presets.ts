/**
 * MCP 精选插件库与生态预设。文案走 i18n，结构字段供测试使用。
 */
import {
  RiCodeSSlashLine,
  RiCpuLine,
  RiDatabase2Line,
  RiFolderLine,
  RiGlobalLine,
  RiMindMap,
  RiSparklingLine
} from "@remixicon/react"
import type { TranslateFn } from "@renderer/i18n"
import type { McpPluginPreset } from "../types/mcp-ui.types"

export const MCP_PLUGIN_CATEGORIES = [
  { id: "all", icon: RiSparklingLine },
  { id: "storage", icon: RiFolderLine },
  { id: "dev", icon: RiCodeSSlashLine },
  { id: "database", icon: RiDatabase2Line },
  { id: "web", icon: RiGlobalLine },
  { id: "apps", icon: RiCpuLine }
] as const

const CATEGORY_LABEL_KEYS: Record<(typeof MCP_PLUGIN_CATEGORIES)[number]["id"], string> = {
  all: "pages.mcp.catAll",
  storage: "pages.mcp.catStorage",
  dev: "pages.mcp.catDev",
  database: "pages.mcp.catDatabase",
  web: "pages.mcp.catWeb",
  apps: "pages.mcp.catApps"
}

export function getMcpPluginCategories(t: TranslateFn) {
  return MCP_PLUGIN_CATEGORIES.map((cat) => ({
    ...cat,
    label: t(CATEGORY_LABEL_KEYS[cat.id])
  }))
}

type PresetDef = Omit<McpPluginPreset, "name" | "categoryLabel" | "description" | "features"> & {
  nameKey: string
  categoryLabelKey: string
  descKey: string
  featKeys: string[]
  envDescKey?: string
}

const PRESET_DEFS: PresetDef[] = [
  {
    id: "filesystem",
    nameKey: "pages.mcp.presetFilesystemName",
    category: "storage",
    categoryLabelKey: "pages.mcp.presetFilesystemCategory",
    icon: RiFolderLine,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    badgeColorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    descKey: "pages.mcp.presetFilesystemDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-filesystem .",
    featKeys: [
      "pages.mcp.presetFilesystemFeat0",
      "pages.mcp.presetFilesystemFeat1",
      "pages.mcp.presetFilesystemFeat2",
      "pages.mcp.presetFilesystemFeat3"
    ],
    sampleTools: ["read_file", "write_file", "list_directory", "search_files"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem"
  },
  {
    id: "everything",
    nameKey: "pages.mcp.presetEverythingName",
    category: "apps",
    categoryLabelKey: "pages.mcp.presetEverythingCategory",
    icon: RiSparklingLine,
    colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    badgeColorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    descKey: "pages.mcp.presetEverythingDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-everything",
    featKeys: [
      "pages.mcp.presetEverythingFeat0",
      "pages.mcp.presetEverythingFeat1",
      "pages.mcp.presetEverythingFeat2",
      "pages.mcp.presetEverythingFeat3"
    ],
    sampleTools: ["echo", "add", "longRunningOperation", "sampleLLM"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/everything"
  },
  {
    id: "github",
    nameKey: "pages.mcp.presetGithubName",
    category: "dev",
    categoryLabelKey: "pages.mcp.presetGithubCategory",
    icon: RiCodeSSlashLine,
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    badgeColorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    descKey: "pages.mcp.presetGithubDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-github",
    envDescKey: "pages.mcp.presetGithubEnv",
    envTemplates: [
      {
        key: "GITHUB_PERSONAL_ACCESS_TOKEN",
        description: "GitHub Personal Access Token (PAT) with repo scope",
        required: true,
        placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx"
      }
    ],
    featKeys: [
      "pages.mcp.presetGithubFeat0",
      "pages.mcp.presetGithubFeat1",
      "pages.mcp.presetGithubFeat2",
      "pages.mcp.presetGithubFeat3"
    ],
    sampleTools: ["search_repositories", "create_issue", "get_file_contents", "list_commits"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/github"
  },
  {
    id: "postgres",
    nameKey: "pages.mcp.presetPostgresName",
    category: "database",
    categoryLabelKey: "pages.mcp.presetPostgresCategory",
    icon: RiDatabase2Line,
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    badgeColorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    descKey: "pages.mcp.presetPostgresDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb",
    featKeys: [
      "pages.mcp.presetPostgresFeat0",
      "pages.mcp.presetPostgresFeat1",
      "pages.mcp.presetPostgresFeat2",
      "pages.mcp.presetPostgresFeat3"
    ],
    sampleTools: ["query", "describe_table", "list_tables", "get_schema"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres"
  },
  {
    id: "sqlite",
    nameKey: "pages.mcp.presetSqliteName",
    category: "database",
    categoryLabelKey: "pages.mcp.presetSqliteCategory",
    icon: RiDatabase2Line,
    colorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    badgeColorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    descKey: "pages.mcp.presetSqliteDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-sqlite --file ./app.db",
    featKeys: [
      "pages.mcp.presetSqliteFeat0",
      "pages.mcp.presetSqliteFeat1",
      "pages.mcp.presetSqliteFeat2",
      "pages.mcp.presetSqliteFeat3"
    ],
    sampleTools: ["read_query", "list_tables", "describe_table"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite"
  },
  {
    id: "puppeteer",
    nameKey: "pages.mcp.presetPuppeteerName",
    category: "web",
    categoryLabelKey: "pages.mcp.presetPuppeteerCategory",
    icon: RiGlobalLine,
    colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    badgeColorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    descKey: "pages.mcp.presetPuppeteerDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-puppeteer",
    featKeys: [
      "pages.mcp.presetPuppeteerFeat0",
      "pages.mcp.presetPuppeteerFeat1",
      "pages.mcp.presetPuppeteerFeat2",
      "pages.mcp.presetPuppeteerFeat3"
    ],
    sampleTools: ["puppeteer_navigate", "puppeteer_screenshot", "puppeteer_click", "puppeteer_evaluate"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer"
  },
  {
    id: "brave-search",
    nameKey: "pages.mcp.presetBraveName",
    category: "web",
    categoryLabelKey: "pages.mcp.presetBraveCategory",
    icon: RiGlobalLine,
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    badgeColorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    descKey: "pages.mcp.presetBraveDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-brave-search",
    envDescKey: "pages.mcp.presetBraveEnv",
    envTemplates: [
      {
        key: "BRAVE_API_KEY",
        description: "Brave Search API Key",
        required: true,
        placeholder: "BSAxxxxxxxxxxxxxxxxxxxx"
      }
    ],
    featKeys: [
      "pages.mcp.presetBraveFeat0",
      "pages.mcp.presetBraveFeat1",
      "pages.mcp.presetBraveFeat2",
      "pages.mcp.presetBraveFeat3"
    ],
    sampleTools: ["brave_web_search", "brave_local_search"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search"
  },
  {
    id: "memory",
    nameKey: "pages.mcp.presetMemoryName",
    category: "storage",
    categoryLabelKey: "pages.mcp.presetMemoryCategory",
    icon: RiMindMap,
    colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    badgeColorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    descKey: "pages.mcp.presetMemoryDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-memory",
    featKeys: [
      "pages.mcp.presetMemoryFeat0",
      "pages.mcp.presetMemoryFeat1",
      "pages.mcp.presetMemoryFeat2",
      "pages.mcp.presetMemoryFeat3"
    ],
    sampleTools: ["create_entities", "create_relations", "read_graph", "search_nodes"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory"
  }
]

function localizePreset(def: PresetDef, t: TranslateFn): McpPluginPreset {
  return {
    id: def.id,
    name: t(def.nameKey),
    category: def.category,
    categoryLabel: t(def.categoryLabelKey),
    icon: def.icon,
    colorClass: def.colorClass,
    badgeColorClass: def.badgeColorClass,
    description: t(def.descKey),
    transport: def.transport,
    command: def.command,
    url: def.url,
    envTemplates: def.envTemplates?.map((env) => ({
      ...env,
      description: def.envDescKey ? t(def.envDescKey) : env.description
    })),
    docsUrl: def.docsUrl,
    features: def.featKeys.map((key) => t(key)),
    sampleTools: def.sampleTools
  }
}

export function getFeaturedMcpPresets(t: TranslateFn): McpPluginPreset[] {
  return PRESET_DEFS.map((def) => localizePreset(def, t))
}

/** 测试用结构数据：名称回落为键路径，协议与命令仍可用。 */
export const FEATURED_MCP_PRESETS = getFeaturedMcpPresets((path) => path)
