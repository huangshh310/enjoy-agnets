/**
 * Agent Studio (功能与资产中心) 统一大厅：
 * 保持左侧 Agent Rail 常驻，主视图采用高密度非对称 Bento 网格控制台。
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  RiAddLine,
  RiArrowRightLine,
  RiBookOpenLine,
  RiCheckLine,
  RiClipboardLine,
  RiDashboardLine,
  RiEqualizer3Line,
  RiFileMusicLine,
  RiFileVideoLine,
  RiFlashlightLine,
  RiFolder6Line,
  RiFolderOpenLine,
  RiImageLine,
  RiLoader4Line,
  RiPlugLine,
  RiPulseLine,
  RiRouteLine,
  RiSearchLine,
  RiSparklingLine
} from "@remixicon/react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cx } from "@/utils/cx"
import type {
  AssetRecord,
  Automation,
  KnowledgeSource,
  McpServer,
  TelemetryMetric,
  WorkflowRun
} from "@enjoy-agents/ipc-contract"
import { AiChatSidebar } from "@renderer/components/ai-chat/ai-chat-sidebar"
import { openQuickSearch } from "@renderer/components/search/quick-search-dialog"
import {
  openFolder,
  selectPersistedSession,
  startPersistedSession
} from "@renderer/hooks/use-agent-session"
import { getIde, hasIde } from "@renderer/lib/ide"
import { formatNodeTime, useChatStore } from "@renderer/stores/chat-store"

export function AgentStudioPage() {
  const navigate = useNavigate()
  const userName = useChatStore((state) => state.userName)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const sessionId = useChatStore((state) => state.sessionId)
  const repositories = useChatStore((state) => state.repositories)
  const expandedIds = useChatStore((state) => state.expandedIds)
  const toggleExpanded = useChatStore((state) => state.toggleExpanded)
  const sidebarCollapsed = useChatStore((state) => state.sidebarCollapsed)
  const setSidebarCollapsed = useChatStore((state) => state.setSidebarCollapsed)

  const [copiedPath, setCopiedPath] = useState(false)

  // 1. Data queries for live metadata & micro-widgets
  const automationsQuery = useQuery({
    queryKey: ["automations"],
    enabled: hasIde(),
    queryFn: () => getIde().automations.list() as Promise<Automation[]>
  })
  const automations = automationsQuery.data ?? []

  const knowledgeQuery = useQuery({
    queryKey: ["knowledge", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () =>
      workspaceId
        ? (getIde().knowledge.sources(workspaceId) as Promise<KnowledgeSource[]>)
        : Promise.resolve([])
  })
  const sources = knowledgeQuery.data ?? []
  const totalChunks = useMemo(
    () => sources.reduce((sum, s) => sum + (s.chunkCount ?? 0), 0),
    [sources]
  )
  const isIndexing = sources.some((s) => s.status === "indexing")

  const workflowsQuery = useQuery({
    queryKey: ["workflows", workspaceId],
    enabled: hasIde(),
    queryFn: () =>
      getIde().workflow.list({ workspaceId: workspaceId ?? undefined }) as Promise<WorkflowRun[]>,
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowRun[] | undefined
      return data?.some((r) => r.status === "running") ? 2000 : false
    }
  })
  const workflowRuns = workflowsQuery.data ?? []
  const runningWorkflows = workflowRuns.filter((r) => r.status === "running")

  const assetsQuery = useQuery({
    queryKey: ["assets"],
    enabled: hasIde(),
    queryFn: () => getIde().assets.list() as Promise<AssetRecord[]>
  })
  const assets = assetsQuery.data ?? []

  const mcpQuery = useQuery({
    queryKey: ["mcp"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })
  const mcpServers = mcpQuery.data ?? []
  const connectedServers = mcpServers.filter((s) => s.connected)
  const totalMcpTools = useMemo(
    () => mcpServers.reduce((sum, s) => sum + (s.tools?.length ?? 0), 0),
    [mcpServers]
  )

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    enabled: hasIde(),
    queryFn: () => getIde().observability.metrics({ limit: 10 }) as Promise<TelemetryMetric[]>
  })
  const metrics = metricsQuery.data ?? []
  const latestMetric = metrics[0]

  function handleCopyPath() {
    if (!workspaceRootLabel) return
    void navigator.clipboard.writeText(workspaceRootLabel)
    setCopiedPath(true)
    setTimeout(() => setCopiedPath(false), 2000)
  }

  return (
    <div className="flex h-full min-h-0 gap-3 bg-background-full px-3 pb-3">
      {/* 1. Persistent Agent Rail Sidebar */}
      <AiChatSidebar
        userName={userName}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        repositories={repositories}
        expandedIds={expandedIds}
        sessionId={sessionId}
        onToggleExpanded={toggleExpanded}
        onSelectSession={(id) => {
          void selectPersistedSession(id)
          void navigate({ to: "/" })
        }}
        onNewSession={() => {
          void startPersistedSession()
          void navigate({ to: "/" })
        }}
        onOpenWorkspace={() => void openFolder()}
        formatTime={formatNodeTime}
      />

      {/* 2. Main Studio Bento Stage */}
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-background-primary-default shadow-card border border-border-button-default/40">
        {/* Stage Top Navigation Bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-separator-border/60 px-6">
          <div className="flex items-center gap-2">
            <RiDashboardLine className="size-4 text-accent-500" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span className="text-body-medium font-semibold text-text-primary">
                    Agent Studio
                  </span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-body-medium text-text-secondary">
                    Overview & Capabilities
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={openQuickSearch}
              className="gap-1.5 h-8 text-caption-2-medium"
            >
              <RiSearchLine className="size-3.5 text-text-tertiary" />
              <span>Quick Search</span>
              <kbd className="rounded bg-background-tertiary-default px-1 font-mono text-[10px] text-text-secondary">
                ⌘L
              </kbd>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                void startPersistedSession()
                void navigate({ to: "/" })
              }}
              className="gap-1.5 h-8 shadow-xs"
            >
              <RiAddLine className="size-4" />
              <span>New Chat</span>
            </Button>
          </div>
        </header>

        {/* Scrollable Stage Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="mx-auto max-w-6xl px-7 pt-6 pb-16 flex flex-col gap-6">
            {/* Studio Hero Header */}
            <div className="relative overflow-hidden rounded-2xl border border-border-button-default bg-gradient-to-br from-background-primary-default via-background-secondary-default/50 to-accent-500/[0.04] p-5 shadow-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 shadow-sm ring-1 ring-accent-500/20">
                    <RiSparklingLine className="size-5.5" />
                  </div>
                  <div>
                    <h2 className="text-title-3-semibold text-text-primary">
                      Studio Control Center
                    </h2>
                    <p className="mt-0.5 text-body-medium text-text-secondary">
                      Live capabilities, workspace resources, durable execution pipelines, and MCP plugins.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-caption-2-medium font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Local-First IDE Engine Active
                  </span>
                </div>
              </div>
            </div>

            {/* Zone 1: 核心资产区 (Assets & Files) */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RiFolder6Line className="size-4 text-accent-500" />
                  <h3 className="text-body-medium font-semibold text-text-primary">
                    Assets & Workspace · 核心资产区
                  </h3>
                </div>
                <span className="text-caption-2-medium text-text-tertiary">
                  Workspaces, RAG embeddings & multimodal media
                </span>
              </div>

              <div className="grid gap-3.5 md:grid-cols-3">
                {/* 1.1 Workspace Folder (Featured 2-column on md) */}
                <article className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md md:col-span-2">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors">
                          <RiFolderOpenLine className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-body-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                              {workspaceName || "No Workspace Opened"}
                            </h4>
                          </div>
                          <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                            Active workspace root and local file index.
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openFolder()}
                        className="gap-1 shadow-xs h-8 text-caption-2-medium shrink-0"
                      >
                        <RiFolderOpenLine className="size-3.5" />
                        <span>Switch folder</span>
                      </Button>
                    </div>

                    {/* Path Bar */}
                    {workspaceRootLabel ? (
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-separator-border/60 bg-background-secondary-default p-2.5">
                        <div className="flex items-center gap-2 min-w-0 font-mono text-[12px] text-text-secondary truncate">
                          <span className="truncate">{workspaceRootLabel}</span>
                        </div>

                        <button
                          type="button"
                          title="Copy workspace path"
                          onClick={handleCopyPath}
                          className="inline-flex items-center rounded-md border border-border-button-default bg-background-primary-default p-1 text-text-tertiary hover:text-text-primary shadow-xs transition-colors shrink-0"
                        >
                          {copiedPath ? (
                            <RiCheckLine className="size-3 text-emerald-500" />
                          ) : (
                            <RiClipboardLine className="size-3" />
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                    <span className="text-caption-2-medium text-text-tertiary">
                      Native filesystem integration via Electron main
                    </span>
                    <button
                      type="button"
                      onClick={() => void navigate({ to: "/" })}
                      className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400 hover:underline"
                    >
                      <span>Open in Chat & Files</span>
                      <RiArrowRightLine className="size-3.5" />
                    </button>
                  </div>
                </article>

                {/* 1.2 Knowledge Base (Span 1) */}
                <article
                  onClick={() => void navigate({ to: "/knowledge" })}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors">
                        <RiBookOpenLine className="size-5" />
                      </div>

                      <span
                        className={cx(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          isIndexing
                            ? "border border-accent-500/20 bg-accent-500/10 text-accent-600 dark:text-accent-400"
                            : sources.length > 0
                              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border border-border-button-default bg-background-secondary-default text-text-tertiary"
                        )}
                      >
                        {isIndexing ? (
                          <span className="inline-flex items-center gap-1">
                            <RiLoader4Line className="size-3 animate-spin" />
                            Indexing
                          </span>
                        ) : sources.length > 0 ? (
                          "Ready"
                        ) : (
                          "Empty"
                        )}
                      </span>
                    </div>

                    <h4 className="mt-3.5 text-body-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                      Knowledge Base (RAG)
                    </h4>
                    <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                      Semantic retriever & vector embeddings.
                    </p>

                    {/* Stats */}
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-background-secondary-default p-2.5 text-center">
                      <div>
                        <p className="font-mono text-body-medium font-semibold text-text-primary">
                          {sources.length}
                        </p>
                        <p className="text-[11px] text-text-tertiary">Sources</p>
                      </div>
                      <div>
                        <p className="font-mono text-body-medium font-semibold text-text-primary">
                          {totalChunks}
                        </p>
                        <p className="text-[11px] text-text-tertiary">Chunks</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                    <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400 group-hover:underline">
                      <span>Manage knowledge</span>
                      <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>

                {/* 1.3 Media Studio (Full Span on bottom row of zone 1) */}
                <article
                  onClick={() => void navigate({ to: "/media" })}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md cursor-pointer md:col-span-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors">
                        <RiImageLine className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-body-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                            Media Studio & Multimodal Assets
                          </h4>
                          <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[11px] font-mono text-text-secondary">
                            {assets.length} assets
                          </span>
                        </div>
                        <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                          Generate images, synthesize spoken audio, transcribe voice, and manage project media.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary">
                        <RiImageLine className="size-3.5 text-accent-500" />
                        <span>Images</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary">
                        <RiFileMusicLine className="size-3.5 text-amber-500" />
                        <span>Speech (TTS)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary">
                        <RiFileVideoLine className="size-3.5 text-purple-500" />
                        <span>Video</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/60 pt-3">
                    <span className="text-caption-2-medium text-text-tertiary">
                      Direct export to workspace with overwrite protection
                    </span>
                    <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400 group-hover:underline">
                      <span>Open Media Studio</span>
                      <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>
              </div>
            </section>

            {/* Zone 2: 能力与编排区 (Orchestration & Tools) */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RiRouteLine className="size-4 text-accent-500" />
                  <h3 className="text-body-medium font-semibold text-text-primary">
                    Orchestration & Tools · 能力与编排区
                  </h3>
                </div>
                <span className="text-caption-2-medium text-text-tertiary">
                  MCP plugins, durable execution pipelines & automations
                </span>
              </div>

              <div className="grid gap-3.5 md:grid-cols-3">
                {/* 2.1 MCP Servers (Featured 2-column) */}
                <article
                  onClick={() => void navigate({ to: "/mcp" })}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md cursor-pointer md:col-span-2"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors">
                          <RiPlugLine className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-body-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                              MCP Plugins Hub
                            </h4>
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {connectedServers.length}/{mcpServers.length} Connected
                            </span>
                            <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[11px] font-mono text-text-secondary">
                              {totalMcpTools} tools
                            </span>
                          </div>
                          <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                            Model Context Protocol endpoints providing external tools and sandboxed UI Apps.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Active Servers List Chips */}
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      {mcpServers.length === 0 ? (
                        <span className="text-caption-2-medium text-text-tertiary italic">
                          No MCP servers registered. Click to connect filesystem, postgres, github, etc.
                        </span>
                      ) : (
                        mcpServers.slice(0, 4).map((server) => (
                          <div
                            key={server.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium"
                          >
                            <span
                              className={cx(
                                "size-1.5 rounded-full",
                                server.connected ? "bg-emerald-500" : "bg-text-tertiary"
                              )}
                            />
                            <span className="font-mono font-medium text-text-primary">
                              {server.name}
                            </span>
                            <span className="text-[10px] text-text-tertiary uppercase">
                              {server.transport}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                    <span className="text-caption-2-medium text-text-tertiary">
                      Processes isolated in main · UI Apps sandboxed in iframe
                    </span>
                    <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400 group-hover:underline">
                      <span>Manage MCP servers</span>
                      <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>

                {/* 2.2 Durable Workflows (Span 1) */}
                <article
                  onClick={() => void navigate({ to: "/workflows" })}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors">
                        <RiRouteLine className="size-5" />
                      </div>

                      <span
                        className={cx(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          runningWorkflows.length > 0
                            ? "border border-accent-500/20 bg-accent-500/10 text-accent-600 dark:text-accent-400"
                            : "border border-border-button-default bg-background-secondary-default text-text-secondary"
                        )}
                      >
                        {runningWorkflows.length > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <RiLoader4Line className="size-3 animate-spin" />
                            {runningWorkflows.length} Running
                          </span>
                        ) : (
                          `${workflowRuns.length} runs`
                        )}
                      </span>
                    </div>

                    <h4 className="mt-3.5 text-body-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                      Durable Workflows
                    </h4>
                    <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                      Multi-step autonomous execution with durable checkpoints.
                    </p>

                    {/* Mini Pipeline Preview */}
                    <div className="mt-3 flex items-center gap-1 rounded-xl bg-background-secondary-default p-2 text-[11px] overflow-hidden">
                      <span className="rounded bg-background-primary-default px-1.5 py-0.5 font-mono text-text-primary shadow-2xs">
                        Plan
                      </span>
                      <span className="text-text-tertiary">→</span>
                      <span className="rounded bg-background-primary-default px-1.5 py-0.5 font-mono text-text-primary shadow-2xs">
                        Act
                      </span>
                      <span className="text-text-tertiary">→</span>
                      <span className="rounded bg-background-primary-default px-1.5 py-0.5 font-mono text-text-primary shadow-2xs">
                        Verify
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                    <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400 group-hover:underline">
                      <span>Open workflows</span>
                      <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>

                {/* 2.3 Automations (Span 3 on bottom of zone 2) */}
                <article
                  onClick={() => void navigate({ to: "/automations" })}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md cursor-pointer md:col-span-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors">
                        <RiFlashlightLine className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-body-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                            Automations & Trigger Rules
                          </h4>
                          <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[11px] font-mono text-text-secondary">
                            {automations.length} active rules
                          </span>
                        </div>
                        <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                          Custom developer instructions triggered manually or automatically on file save.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2.5 py-0.5 text-caption-2-medium text-accent-600 dark:text-accent-400 font-semibold">
                        <RiFlashlightLine className="size-3 text-accent-500" />
                        <span>On-Save Triggers</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-0.5 text-caption-2-medium text-text-secondary">
                        <span>Manual Prompts</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/60 pt-3">
                    <span className="text-caption-2-medium text-text-tertiary">
                      Execute code audits, test suites, and commit notes automatically
                    </span>
                    <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400 group-hover:underline">
                      <span>Configure automations</span>
                      <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>
              </div>
            </section>

            {/* Zone 3: 配置与分析区 (Config & Insights) */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RiPulseLine className="size-4 text-accent-500" />
                  <h3 className="text-body-medium font-semibold text-text-primary">
                    Config & Insights · 配置与分析区
                  </h3>
                </div>
                <span className="text-caption-2-medium text-text-tertiary">
                  Prompt customization & execution telemetry trace
                </span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* 3.1 Customize */}
                <article
                  onClick={() =>
                    void navigate({
                      to: "/customize/$section",
                      params: { section: "instructions" }
                    })
                  }
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors">
                        <RiEqualizer3Line className="size-5" />
                      </div>

                      <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                        Rules & Persona
                      </span>
                    </div>

                    <h4 className="mt-3.5 text-body-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                      Agent Customization
                    </h4>
                    <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                      System prompt directives, rules file references, and subagent persona behavior.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                    <span className="text-caption-2-medium text-text-tertiary">
                      Customize prompt rules
                    </span>
                    <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400 group-hover:underline">
                      <span>Customize agent</span>
                      <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>

                {/* 3.2 Observability */}
                <article
                  onClick={() => void navigate({ to: "/observability" })}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors">
                        <RiPulseLine className="size-5" />
                      </div>

                      <span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[11px] font-semibold text-accent-600 dark:text-accent-400">
                        {metrics.length} logged
                      </span>
                    </div>

                    <h4 className="mt-3.5 text-body-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                      Observability & Telemetry
                    </h4>
                    <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                      Redacted execution traces, token throughput, TTFO latency & JSON export.
                    </p>

                    {/* Mini Performance Stat */}
                    {latestMetric ? (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-background-secondary-default p-2.5 text-[11px]">
                        <span className="font-mono text-text-secondary">
                          Latest: {latestMetric.durationMs ?? 0}ms
                        </span>
                        {latestMetric.ttfoMs ? (
                          <span className="text-accent-600 dark:text-accent-400 font-medium">
                            TTFO: {latestMetric.ttfoMs}ms
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                    <span className="text-caption-2-medium text-text-tertiary">
                      OTEL disabled by default
                    </span>
                    <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400 group-hover:underline">
                      <span>View metrics & trace</span>
                      <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
