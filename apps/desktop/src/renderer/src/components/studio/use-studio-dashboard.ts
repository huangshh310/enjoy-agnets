/**
 * Studio 大厅的 live 查询：知识、资产、MCP、工作流、自动化、指标。
 */
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type {
  AssetRecord,
  Automation,
  KnowledgeSource,
  McpServer,
  TelemetryMetric,
  WorkflowRun
} from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"

export function useStudioDashboard(workspaceId: string | null) {
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
      workspaceId ? (getIde().knowledge.sources(workspaceId) as Promise<KnowledgeSource[]>) : Promise.resolve([])
  })
  const sources = knowledgeQuery.data ?? []
  const totalChunks = useMemo(
    () => sources.reduce((sum, source) => sum + (source.chunkCount ?? 0), 0),
    [sources]
  )
  const isIndexing = sources.some((source) => source.status === "indexing")

  const workflowsQuery = useQuery({
    queryKey: ["workflows", workspaceId],
    enabled: hasIde(),
    queryFn: () =>
      getIde().workflow.list({ workspaceId: workspaceId ?? undefined }) as Promise<WorkflowRun[]>,
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowRun[] | undefined
      return data?.some((run) => run.status === "running") ? 2000 : false
    }
  })
  const workflowRuns = workflowsQuery.data ?? []
  const runningWorkflows = workflowRuns.filter((run) => run.status === "running")

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
  const connectedServers = mcpServers.filter((server) => server.connected)
  const totalMcpTools = useMemo(
    () => mcpServers.reduce((sum, server) => sum + (server.tools?.length ?? 0), 0),
    [mcpServers]
  )

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    enabled: hasIde(),
    queryFn: () => getIde().observability.metrics({ limit: 10 }) as Promise<TelemetryMetric[]>
  })
  const metrics = metricsQuery.data ?? []

  return {
    automations,
    sources,
    totalChunks,
    isIndexing,
    workflowRuns,
    runningWorkflows,
    assets,
    mcpServers,
    connectedServers,
    totalMcpTools,
    metrics,
    latestMetric: metrics[0]
  }
}
