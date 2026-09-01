/**
 * MCP Server 与插件生态页面：
 * 采用专业桌面 IDE 风格，左侧承载核心视图路由（已配置服务 / 插件市场 / JSON 规格编辑器），
 * 支持多协议连接、细粒度工具权限控制 (Allow/Ask/Deny) 与受限沙箱 App。
 */
import { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAddLine,
  RiFileCodeLine,
  RiPlugLine,
  RiSearchLine,
  RiShoppingBag3Line,
  RiSparklingLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"
import { McpAppModal } from "./components/mcp-app-modal"
import { McpCreateModal } from "./components/mcp-create-modal"
import { McpHeader } from "./components/mcp-header"
import { McpJsonEditorView } from "./components/mcp-json-editor-view"
import { McpServerCard } from "./components/mcp-server-card"
import { McpServerToolsModal } from "./components/mcp-server-tools-modal"
import { McpStoreSection } from "./components/mcp-store-section"
import type { McpActiveTab, McpOverviewStats, McpPluginPreset } from "./types/mcp-ui.types"

export function McpPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<McpActiveTab>("servers")
  const [serverSearch, setServerSearch] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 弹窗状态管理
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServer | null>(null)
  const [toolsModalServer, setToolsModalServer] = useState<McpServer | null>(null)

  // MCP App 弹窗状态
  const [appModalOpen, setAppModalOpen] = useState(false)
  const [openServerId, setOpenServerId] = useState<string | null>(null)
  const [appSrcDoc, setAppSrcDoc] = useState<string | null>(null)
  const [appTitle, setAppTitle] = useState("MCP App")
  const [lastLog, setLastLog] = useState<string | null>(null)

  // 查询当前注册的所有 Servers
  const serversQuery = useQuery({
    queryKey: ["mcp"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })
  const servers = serversQuery.data ?? []

  // 汇总统计数据
  const stats: McpOverviewStats = useMemo(() => {
    const connected = servers.filter((s) => s.connected).length
    const trusted = servers.filter((s) => s.trusted).length
    const totalTools = servers.reduce((sum, s) => sum + (s.tools?.length ?? 0), 0)
    return { total: servers.length, connected, trusted, totalTools }
  }, [servers])

  // 左侧侧边栏导航分组
  const groups = useMemo(
    () => [
      {
        id: "servers",
        label: "MCP Protocol",
        items: [
          {
            id: "servers",
            label: "已配置服务",
            icon: RiPlugLine,
            meta: String(servers.length)
          },
          {
            id: "marketplace",
            label: "精选插件市场",
            icon: RiShoppingBag3Line
          },
          {
            id: "json",
            label: "JSON 规格配置",
            icon: RiFileCodeLine
          }
        ]
      }
    ],
    [servers.length]
  )

  async function refresh() {
    setIsRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ["mcp"] })
    } finally {
      setIsRefreshing(false)
    }
  }

  // 打开 MCP App
  async function openApp(serverId: string) {
    const opened = (await getIde().mcp.openApp({ id: serverId })) as {
      srcDoc: string
      title?: string
    }
    setOpenServerId(serverId)
    setAppSrcDoc(opened.srcDoc)
    setAppTitle(opened.title ?? "MCP App")
    setLastLog(null)
    setAppModalOpen(true)
  }

  const onAppMessage = useCallback(
    (raw: unknown) => {
      if (!openServerId) return
      void getIde()
        .mcp.appMessage({ id: openServerId, message: raw })
        .then((result) => {
          const text = textFrom(result)
          if (text) setLastLog(text)
        })
    },
    [openServerId]
  )

  // 精选市场一键接入
  async function handleQuickConnectPreset(preset: McpPluginPreset) {
    await getIde().mcp.upsert({
      name: preset.id,
      transport: preset.transport,
      command: preset.command,
      url: preset.url,
      allowedResourceUris: [],
      modelVisibleTools: [],
      appOnlyTools: [],
      trusted: false
    })
    await refresh()
    setActiveTab("servers")
  }

  // 从精选市场预填配置
  function handlePrefillPreset(preset: McpPluginPreset) {
    const existing = servers.find((s) => s.name === preset.id)
    if (existing) {
      setEditingServer(existing)
    } else {
      setEditingServer({
        id: "",
        name: preset.id,
        transport: preset.transport,
        command: preset.command,
        url: preset.url,
        allowedResourceUris: [],
        modelVisibleTools: [],
        appOnlyTools: [],
        trusted: false,
        connected: false
      })
    }
    setCreateModalOpen(true)
  }

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(serverSearch.toLowerCase())
  )

  return (
    <SecondaryPageShell
      searchPlaceholder="Filter MCP servers..."
      groups={groups}
      selectedId={activeTab}
      onSelect={(id) => setActiveTab(id as McpActiveTab)}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-5 pb-8">
        {/* 顶部标题与操作栏 */}
        <McpHeader
          stats={stats}
          onAddClick={() => {
            setEditingServer(null)
            setCreateModalOpen(true)
          }}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
        />

        {/* 视图 1: 已配置服务列表 */}
        {activeTab === "servers" && (
          <section className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption-1-medium font-semibold text-text-primary">
                已注册服务 ({filteredServers.length})
              </span>

              {servers.length > 0 ? (
                <div className="relative w-56">
                  <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
                  <Input
                    value={serverSearch}
                    onChange={(e) => setServerSearch(e.target.value)}
                    placeholder="搜索服务名称..."
                    className="pl-8 h-7.5 text-caption-2-medium bg-background-primary-default"
                  />
                </div>
              ) : null}
            </div>

            {servers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 p-10 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg bg-background-secondary-default text-text-tertiary mb-3">
                  <RiPlugLine className="size-5" />
                </div>
                <h3 className="text-body-medium font-semibold text-text-primary">
                  暂未配置任何 MCP Server
                </h3>
                <p className="mt-1 max-w-sm text-caption-2-medium text-text-tertiary leading-relaxed">
                  通过 Model Context Protocol 连接文件系统、数据库或外部 API，让 Agent 在对话中自由调度。
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingServer(null)
                      setCreateModalOpen(true)
                    }}
                    className="gap-1.5 h-7.5 text-caption-2-medium shadow-xs"
                  >
                    <RiAddLine className="size-3.5" />
                    <span>注册 Server</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("marketplace")}
                    className="gap-1.5 h-7.5 text-caption-2-medium"
                  >
                    <RiSparklingLine className="size-3.5 text-accent-500" />
                    <span>浏览精选市场</span>
                  </Button>
                </div>
              </div>
            ) : filteredServers.length === 0 ? (
              <div className="py-10 text-center text-caption-2-medium text-text-tertiary">
                未搜索到匹配的服务
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredServers.map((server) => (
                  <McpServerCard
                    key={server.id}
                    server={server}
                    onChanged={refresh}
                    onOpenApp={openApp}
                    onExploreTools={(s) => setToolsModalServer(s)}
                    onEdit={(s) => {
                      setEditingServer(s)
                      setCreateModalOpen(true)
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 视图 2: 精选插件市场 */}
        {activeTab === "marketplace" && (
          <McpStoreSection
            servers={servers}
            onQuickConnect={handleQuickConnectPreset}
            onPrefill={handlePrefillPreset}
            isAdding={false}
          />
        )}

        {/* 视图 3: 原生内嵌 JSON 规格配置 */}
        {activeTab === "json" && (
          <McpJsonEditorView servers={servers} onChanged={refresh} />
        )}
      </div>

      {/* 弹窗集合 */}
      <McpCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialServer={editingServer}
        onChanged={refresh}
      />

      <McpServerToolsModal
        server={toolsModalServer}
        open={Boolean(toolsModalServer)}
        onOpenChange={(open) => {
          if (!open) setToolsModalServer(null)
        }}
        onChanged={refresh}
      />

      <McpAppModal
        open={appModalOpen}
        onOpenChange={setAppModalOpen}
        appTitle={appTitle}
        appSrcDoc={appSrcDoc}
        lastLog={lastLog}
        onAppMessage={onAppMessage}
        onRefreshApp={() => {
          if (openServerId) void openApp(openServerId)
        }}
      />
    </SecondaryPageShell>
  )
}

function textFrom(result: unknown): string | null {
  if (!result || typeof result !== "object") return null
  const res = result as { text?: unknown; method?: unknown }
  if (typeof res.text === "string") return res.text
  return null
}
