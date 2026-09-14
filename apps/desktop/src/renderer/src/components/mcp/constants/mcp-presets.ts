/**
 * MCP 精选插件库与生态预设。文案走 i18n，结构字段供测试使用。
 */
import {
  RiCodeSSlashLine,
  RiCpuLine,
  RiDatabase2Line,
  RiFolderLine,
  RiGlobalLine,
  RiSparklingLine
} from "@remixicon/react"
import type { TranslateFn } from "@renderer/i18n"
import {
  BraveIcon,
  DockerIcon,
  FetchWebIcon,
  FilesystemIcon,
  GitIcon,
  GithubIcon,
  GitLabIcon,
  LinearIcon,
  McpIcon,
  MemoryGraphIcon,
  MySqlIcon,
  NotionIcon,
  PlaywrightIcon,
  PostgreSqlIcon,
  PuppeteerIcon,
  RedisIcon,
  SentryIcon,
  SequentialThinkingIcon,
  SlackIcon,
  SqliteIcon
} from "../components/mcp-brand-icons.ts"
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
    icon: FilesystemIcon,
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
    icon: McpIcon,
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
    icon: GithubIcon,
    colorClass: "bg-zinc-500/10 text-zinc-900 dark:text-zinc-100 border-zinc-500/20",
    badgeColorClass: "bg-zinc-500/10 text-zinc-900 dark:text-zinc-100",
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
    icon: PostgreSqlIcon,
    colorClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    badgeColorClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
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
    icon: SqliteIcon,
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
    icon: PuppeteerIcon,
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    badgeColorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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
    icon: BraveIcon,
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
    icon: MemoryGraphIcon,
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
  },
  {
    id: "docker",
    nameKey: "pages.mcp.presetDockerName",
    category: "dev",
    categoryLabelKey: "pages.mcp.presetDockerCategory",
    icon: DockerIcon,
    colorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    badgeColorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    descKey: "pages.mcp.presetDockerDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-docker",
    featKeys: [
      "pages.mcp.presetDockerFeat0",
      "pages.mcp.presetDockerFeat1",
      "pages.mcp.presetDockerFeat2",
      "pages.mcp.presetDockerFeat3"
    ],
    sampleTools: ["list_containers", "start_container", "stop_container", "get_logs"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/docker"
  },
  {
    id: "redis",
    nameKey: "pages.mcp.presetRedisName",
    category: "database",
    categoryLabelKey: "pages.mcp.presetRedisCategory",
    icon: RedisIcon,
    colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    badgeColorClass: "bg-red-500/10 text-red-600 dark:text-red-400",
    descKey: "pages.mcp.presetRedisDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-redis redis://localhost:6379",
    featKeys: [
      "pages.mcp.presetRedisFeat0",
      "pages.mcp.presetRedisFeat1",
      "pages.mcp.presetRedisFeat2",
      "pages.mcp.presetRedisFeat3"
    ],
    sampleTools: ["get", "set", "keys", "ttl"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/redis"
  },
  {
    id: "gitlab",
    nameKey: "pages.mcp.presetGitlabName",
    category: "dev",
    categoryLabelKey: "pages.mcp.presetGitlabCategory",
    icon: GitLabIcon,
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    badgeColorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    descKey: "pages.mcp.presetGitlabDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-gitlab",
    envDescKey: "pages.mcp.presetGitlabEnv",
    envTemplates: [
      {
        key: "GITLAB_PERSONAL_ACCESS_TOKEN",
        description: "GitLab Personal Access Token with api scope",
        required: true,
        placeholder: "glpat-xxxxxxxxxxxxxxxxxxxx"
      }
    ],
    featKeys: [
      "pages.mcp.presetGitlabFeat0",
      "pages.mcp.presetGitlabFeat1",
      "pages.mcp.presetGitlabFeat2",
      "pages.mcp.presetGitlabFeat3"
    ],
    sampleTools: ["get_project", "list_merge_requests", "get_issue"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab"
  },
  {
    id: "slack",
    nameKey: "pages.mcp.presetSlackName",
    category: "apps",
    categoryLabelKey: "pages.mcp.presetSlackCategory",
    icon: SlackIcon,
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    badgeColorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    descKey: "pages.mcp.presetSlackDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-slack",
    envDescKey: "pages.mcp.presetSlackEnv",
    envTemplates: [
      {
        key: "SLACK_BOT_TOKEN",
        description: "Slack Bot Token (xoxb-...)",
        required: true,
        placeholder: "xoxb-xxxxxxxxxxxxxxxxxxxx"
      }
    ],
    featKeys: [
      "pages.mcp.presetSlackFeat0",
      "pages.mcp.presetSlackFeat1",
      "pages.mcp.presetSlackFeat2",
      "pages.mcp.presetSlackFeat3"
    ],
    sampleTools: ["post_message", "list_channels", "get_channel_history"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack"
  },
  {
    id: "notion",
    nameKey: "pages.mcp.presetNotionName",
    category: "apps",
    categoryLabelKey: "pages.mcp.presetNotionCategory",
    icon: NotionIcon,
    colorClass: "bg-zinc-500/10 text-zinc-900 dark:text-zinc-100 border-zinc-500/20",
    badgeColorClass: "bg-zinc-500/10 text-zinc-900 dark:text-zinc-100",
    descKey: "pages.mcp.presetNotionDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-notion",
    envDescKey: "pages.mcp.presetNotionEnv",
    envTemplates: [
      {
        key: "NOTION_API_KEY",
        description: "Notion Integration Token",
        required: true,
        placeholder: "secret_xxxxxxxxxxxxxxxxxxxx"
      }
    ],
    featKeys: [
      "pages.mcp.presetNotionFeat0",
      "pages.mcp.presetNotionFeat1",
      "pages.mcp.presetNotionFeat2",
      "pages.mcp.presetNotionFeat3"
    ],
    sampleTools: ["search_pages", "get_page", "query_database"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/notion"
  },
  {
    id: "linear",
    nameKey: "pages.mcp.presetLinearName",
    category: "dev",
    categoryLabelKey: "pages.mcp.presetLinearCategory",
    icon: LinearIcon,
    colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    badgeColorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    descKey: "pages.mcp.presetLinearDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-linear",
    envDescKey: "pages.mcp.presetLinearEnv",
    envTemplates: [
      {
        key: "LINEAR_API_KEY",
        description: "Linear Personal API Key",
        required: true,
        placeholder: "lin_api_xxxxxxxxxxxxxxxxxxxx"
      }
    ],
    featKeys: [
      "pages.mcp.presetLinearFeat0",
      "pages.mcp.presetLinearFeat1",
      "pages.mcp.presetLinearFeat2",
      "pages.mcp.presetLinearFeat3"
    ],
    sampleTools: ["search_issues", "create_issue", "get_project"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/linear"
  },
  {
    id: "sentry",
    nameKey: "pages.mcp.presetSentryName",
    category: "dev",
    categoryLabelKey: "pages.mcp.presetSentryCategory",
    icon: SentryIcon,
    colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    badgeColorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    descKey: "pages.mcp.presetSentryDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-sentry",
    envDescKey: "pages.mcp.presetSentryEnv",
    envTemplates: [
      {
        key: "SENTRY_AUTH_TOKEN",
        description: "Sentry Authentication Token",
        required: true,
        placeholder: "sntrys_xxxxxxxxxxxxxxxxxxxx"
      }
    ],
    featKeys: [
      "pages.mcp.presetSentryFeat0",
      "pages.mcp.presetSentryFeat1",
      "pages.mcp.presetSentryFeat2",
      "pages.mcp.presetSentryFeat3"
    ],
    sampleTools: ["list_issues", "get_issue_details", "get_events"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/sentry"
  },
  {
    id: "fetch",
    nameKey: "pages.mcp.presetFetchName",
    category: "web",
    categoryLabelKey: "pages.mcp.presetFetchCategory",
    icon: FetchWebIcon,
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    badgeColorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    descKey: "pages.mcp.presetFetchDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-fetch",
    featKeys: [
      "pages.mcp.presetFetchFeat0",
      "pages.mcp.presetFetchFeat1",
      "pages.mcp.presetFetchFeat2",
      "pages.mcp.presetFetchFeat3"
    ],
    sampleTools: ["fetch_url"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch"
  },
  {
    id: "sequential-thinking",
    nameKey: "pages.mcp.presetSequentialThinkingName",
    category: "apps",
    categoryLabelKey: "pages.mcp.presetSequentialThinkingCategory",
    icon: SequentialThinkingIcon,
    colorClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    badgeColorClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    descKey: "pages.mcp.presetSequentialThinkingDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-sequential-thinking",
    featKeys: [
      "pages.mcp.presetSequentialThinkingFeat0",
      "pages.mcp.presetSequentialThinkingFeat1",
      "pages.mcp.presetSequentialThinkingFeat2",
      "pages.mcp.presetSequentialThinkingFeat3"
    ],
    sampleTools: ["sequentialthinking"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/sequential-thinking"
  },
  {
    id: "git",
    nameKey: "pages.mcp.presetGitName",
    category: "dev",
    categoryLabelKey: "pages.mcp.presetGitCategory",
    icon: GitIcon,
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    badgeColorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    descKey: "pages.mcp.presetGitDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-git",
    featKeys: [
      "pages.mcp.presetGitFeat0",
      "pages.mcp.presetGitFeat1",
      "pages.mcp.presetGitFeat2",
      "pages.mcp.presetGitFeat3"
    ],
    sampleTools: ["git_status", "git_diff", "git_log"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/git"
  },
  {
    id: "mysql",
    nameKey: "pages.mcp.presetMysqlName",
    category: "database",
    categoryLabelKey: "pages.mcp.presetMysqlCategory",
    icon: MySqlIcon,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    badgeColorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    descKey: "pages.mcp.presetMysqlDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-mysql mysql://root@localhost/db",
    featKeys: [
      "pages.mcp.presetMysqlFeat0",
      "pages.mcp.presetMysqlFeat1",
      "pages.mcp.presetMysqlFeat2",
      "pages.mcp.presetMysqlFeat3"
    ],
    sampleTools: ["describe_table", "read_query", "list_tables"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/mysql"
  },
  {
    id: "playwright",
    nameKey: "pages.mcp.presetPlaywrightName",
    category: "web",
    categoryLabelKey: "pages.mcp.presetPlaywrightCategory",
    icon: PlaywrightIcon,
    colorClass: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    badgeColorClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    descKey: "pages.mcp.presetPlaywrightDesc",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-playwright",
    featKeys: [
      "pages.mcp.presetPlaywrightFeat0",
      "pages.mcp.presetPlaywrightFeat1",
      "pages.mcp.presetPlaywrightFeat2",
      "pages.mcp.presetPlaywrightFeat3"
    ],
    sampleTools: ["browser_navigate", "browser_click", "browser_snapshot"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/playwright"
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
