/**
 * MCP 页状态：列表、统计、App 沙箱、精选市场接入。
 */
import { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiFileCodeLine, RiPlugLine, RiShoppingBag3Line } from "@remixicon/react"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { textFromAppMessage } from "../lib/app-message-text"
import type { McpActiveTab, McpOverviewStats, McpPluginPreset } from "../types/mcp-ui.types"

export function useMcpPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<McpActiveTab>("servers")
  const [serverSearch, setServerSearch] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServer | null>(null)
  const [toolsModalServer, setToolsModalServer] = useState<McpServer | null>(null)

  const [appModalOpen, setAppModalOpen] = useState(false)
  const [openServerId, setOpenServerId] = useState<string | null>(null)
  const [appSrcDoc, setAppSrcDoc] = useState<string | null>(null)
  const [appTitle, setAppTitle] = useState("MCP App")
  const [lastLog, setLastLog] = useState<string | null>(null)

  const serversQuery = useQuery({
    queryKey: ["mcp"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })
  const servers = serversQuery.data ?? []

  const stats: McpOverviewStats = useMemo(() => {
    const connected = servers.filter((s) => s.connected).length
    const trusted = servers.filter((s) => s.trusted).length
    const totalTools = servers.reduce((sum, s) => sum + (s.tools?.length ?? 0), 0)
    return { total: servers.length, connected, trusted, totalTools }
  }, [servers])

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
          const text = textFromAppMessage(result)
          if (text) setLastLog(text)
        })
    },
    [openServerId]
  )

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

  function openCreateModal(server: McpServer | null = null) {
    setEditingServer(server)
    setCreateModalOpen(true)
  }

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(serverSearch.toLowerCase())
  )

  return {
    activeTab,
    setActiveTab,
    serverSearch,
    setServerSearch,
    isRefreshing,
    createModalOpen,
    setCreateModalOpen,
    editingServer,
    toolsModalServer,
    setToolsModalServer,
    appModalOpen,
    setAppModalOpen,
    openServerId,
    appSrcDoc,
    appTitle,
    lastLog,
    servers,
    stats,
    groups,
    filteredServers,
    refresh,
    openApp,
    onAppMessage,
    handleQuickConnectPreset,
    handlePrefillPreset,
    openCreateModal
  }
}
