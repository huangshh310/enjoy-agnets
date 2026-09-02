/**
 * Agent Studio 领域工坊类型定义与常量。
 */
import type {
  AssetRecord,
  Automation,
  KnowledgeSource,
  McpServer,
  TelemetryMetric,
  WorkflowRun
} from "@enjoy-agents/ipc-contract"

export type StudioTab = "overview" | "grounding" | "extensions" | "ops"

export type StudioDashboardData = {
  automations: Automation[]
  sources: KnowledgeSource[]
  totalChunks: number
  isIndexing: boolean
  workflowRuns: WorkflowRun[]
  runningWorkflows: WorkflowRun[]
  assets: AssetRecord[]
  mcpServers: McpServer[]
  connectedServers: McpServer[]
  totalMcpTools: number
  metrics: TelemetryMetric[]
  latestMetric: TelemetryMetric | undefined
}

export type StudioCommonProps = {
  workspaceName: string
  workspaceRootLabel: string
  copiedPath: boolean
  onCopyPath: () => void
  onOpenChat: () => void
  dash: StudioDashboardData
  onNavigateTo: (path: string) => void
}
