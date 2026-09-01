/**
 * MCP 精选插件库与生态预设
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
import type { McpPluginPreset } from "../types/mcp-ui.types"

export const MCP_PLUGIN_CATEGORIES = [
  { id: "all", label: "全部插件", icon: RiSparklingLine },
  { id: "storage", label: "文件与存储", icon: RiFolderLine },
  { id: "dev", label: "开发与代码", icon: RiCodeSSlashLine },
  { id: "database", label: "数据库与 SQL", icon: RiDatabase2Line },
  { id: "web", label: "网络与搜索", icon: RiGlobalLine },
  { id: "apps", label: "多功能与 UI App", icon: RiCpuLine }
] as const

export const FEATURED_MCP_PRESETS: McpPluginPreset[] = [
  {
    id: "filesystem",
    name: "Local Filesystem",
    category: "storage",
    categoryLabel: "File & Storage",
    icon: RiFolderLine,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    badgeColorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description: "为 Agent 循环提供完整的本地文件系统读取、写入、目录遍历和文件树分析能力。",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-filesystem .",
    features: ["文件读写", "目录遍历", "路径搜索", "安全沙箱约束"],
    sampleTools: ["read_file", "write_file", "list_directory", "search_files"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem"
  },
  {
    id: "everything",
    name: "Everything Suite",
    category: "apps",
    categoryLabel: "Full Toolkit & Apps",
    icon: RiSparklingLine,
    colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    badgeColorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    description: "多功能演示工具箱，包含资源模板、Prompt 模板以及可在独立沙箱 iframe 容器内渲染的交互 UI App。",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-everything",
    features: ["沙箱交互 App", "Prompt 模板", "自定义资源", "测试工具集"],
    sampleTools: ["echo", "add", "longRunningOperation", "sampleLLM"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/everything"
  },
  {
    id: "github",
    name: "GitHub Ecosystem",
    category: "dev",
    categoryLabel: "DevOps & VCS",
    icon: RiCodeSSlashLine,
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    badgeColorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    description: "通过 Agent 命令直接管理 GitHub 代码库、检索 Pull Requests、查询 Issue、审查代码并触发 Actions。",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-github",
    envTemplates: [
      {
        key: "GITHUB_PERSONAL_ACCESS_TOKEN",
        description: "GitHub Personal Access Token (PAT) with repo scope",
        required: true,
        placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx"
      }
    ],
    features: ["PR 管理", "Issue 查询", "代码检索", "分支与 Commit 操作"],
    sampleTools: ["search_repositories", "create_issue", "get_file_contents", "list_commits"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/github"
  },
  {
    id: "postgres",
    name: "PostgreSQL Database",
    category: "database",
    categoryLabel: "Data & Query",
    icon: RiDatabase2Line,
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    badgeColorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    description: "连接 PostgreSQL 数据库，检查数据表 Schema 架构定义，并安全执行只读 SQL 查询与分析。",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb",
    features: ["表结构自省", "只读 SQL 执行", "数据字典分析", "连接池自适应"],
    sampleTools: ["query", "describe_table", "list_tables", "get_schema"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres"
  },
  {
    id: "sqlite",
    name: "SQLite Database",
    category: "database",
    categoryLabel: "Local DB & SQL",
    icon: RiDatabase2Line,
    colorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    badgeColorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    description: "快速连接并分析本地 SQLite 数据库文件，支持只读 SQL 查询、索引分析与表关联解析。",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-sqlite --file ./app.db",
    features: ["本地 DB 直连", "轻量零配置", "Schema 探查", "安全只读隔离"],
    sampleTools: ["read_query", "list_tables", "describe_table"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite"
  },
  {
    id: "puppeteer",
    name: "Puppeteer Browser Automation",
    category: "web",
    categoryLabel: "Web & Scraping",
    icon: RiGlobalLine,
    colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    badgeColorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    description: "赋予 Agent 驱动无头浏览器访问动态网页、抓取渲染内容、执行交互以及截取屏幕画面的能力。",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-puppeteer",
    features: ["无头 Chromium", "页面截图", "DOM 内容提取", "表单交互与点击"],
    sampleTools: ["puppeteer_navigate", "puppeteer_screenshot", "puppeteer_click", "puppeteer_evaluate"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer"
  },
  {
    id: "brave-search",
    name: "Brave Search",
    category: "web",
    categoryLabel: "Web & Search",
    icon: RiGlobalLine,
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    badgeColorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    description: "使用 Brave 搜索引擎 API 进行全球互联网搜索与本地商户搜索，为 Agent 补充实时资讯。",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-brave-search",
    envTemplates: [
      {
        key: "BRAVE_API_KEY",
        description: "Brave Search API Key",
        required: true,
        placeholder: "BSAxxxxxxxxxxxxxxxxxxxx"
      }
    ],
    features: ["网页搜索", "本地商家检索", "实时新闻获取", "零追踪隐私保护"],
    sampleTools: ["brave_web_search", "brave_local_search"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search"
  },
  {
    id: "memory",
    name: "Knowledge Graph Memory",
    category: "storage",
    categoryLabel: "Memory & Graph",
    icon: RiMindMap,
    colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    badgeColorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    description: "基于实体和关系的开源知识图谱内存服务器，让 Agent 跨会话持续积累上下文与长效记忆。",
    transport: "stdio",
    command: "npx -y @modelcontextprotocol/server-memory",
    features: ["实体抽取与存储", "关系网络建立", "语义图谱查询", "长周期记忆"],
    sampleTools: ["create_entities", "create_relations", "read_graph", "search_nodes"],
    docsUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory"
  }
]
