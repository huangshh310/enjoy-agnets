/**
 * AI 能力 IPC：generate / assets / knowledge / workflow / mcp / realtime / observability。
 */
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron"
import {
  AiGenerateInput,
  AssetsDeleteInput,
  AssetsExportInput,
  AssetsImportInput,
  AssetsReadInput,
  AssetsUploadInput,
  KnowledgeAddSourceInput,
  KnowledgeCancelInput,
  KnowledgeDocumentsInput,
  KnowledgeIndexInput,
  KnowledgeRemoveInput,
  KnowledgeSearchInput,
  KnowledgeSourcesInput,
  McpAppMessageInput,
  McpCallInput,
  McpIdInput,
  McpOpenAppInput,
  McpSetPermissionInput,
  McpUpsertInput,
  ObservabilityCliUsageInput,
  ObservabilityExportInput,
  ObservabilityMetricsInput,
  ObservabilityReplayInput,
  ObservabilitySetPolicyInput,
  WorkflowCancelInput,
  WorkflowGetInput,
  WorkflowListInput,
  WorkflowRecoverInput,
  WorkflowResumeInput,
  WorkflowRetryInput,
  WorkflowStartInput
} from "@enjoy-agents/ipc-contract"
import { abortGeneration, resumeGeneration } from "./services/ai-generation"
import { createDesktopRuntime } from "./services/desktop-runtime"
import {
  exportAsset,
  importAsset,
  listImportedAssets,
  readAssetBytes,
  removeAsset
} from "./services/asset-service"
import { uploadAssetToProvider } from "./services/provider-files"
import {
  addKnowledgeSource,
  cancelKnowledgeIndex,
  indexKnowledgeSource,
  listKnowledgeDocuments,
  listKnowledgeSources,
  removeKnowledgeSource,
  searchKnowledge
} from "./services/knowledge-service"
import {
  callServerTool,
  connectServer,
  disconnectServer,
  listServers,
  listServerTools,
  removeServer,
  setPermission,
  testServer,
  upsertServer
} from "./services/mcp-service"
import { handleMcpAppMessage, openMcpApp } from "./services/mcp-app"
import { closeRealtime, openRealtime, sendRealtimeAudio } from "./services/realtime-service"
import { collectCliTranscriptUsage } from "./services/cli-transcript-usage"
import { exportMetrics, queryMetrics, setTelemetryPolicy } from "./services/telemetry-service"
import { listReplayEvents } from "./services/event-bus"
import { readPreferences } from "./services/preferences"
import {
  cancelWorkflow,
  getWorkflow,
  listWorkflows,
  recoverPausedWorkflows,
  resumeWorkflow,
  retryWorkflow,
  startWorkflow
} from "./services/workflow-runner"

export const AI_CHANNELS = [
  "ai.generate",
  "ai.abort",
  "ai.resume",
  "assets.import",
  "assets.list",
  "assets.read",
  "assets.export",
  "assets.delete",
  "assets.upload",
  "knowledge.sources",
  "knowledge.documents",
  "knowledge.addSource",
  "knowledge.index",
  "knowledge.search",
  "knowledge.cancel",
  "knowledge.remove",
  "workflow.list",
  "workflow.get",
  "workflow.start",
  "workflow.recover",
  "workflow.resume",
  "workflow.cancel",
  "workflow.retry",
  "mcp.servers",
  "mcp.upsert",
  "mcp.remove",
  "mcp.connect",
  "mcp.disconnect",
  "mcp.test",
  "mcp.tools",
  "mcp.call",
  "mcp.setPermission",
  "mcp.openApp",
  "mcp.appMessage",
  "realtime.open",
  "realtime.sendAudio",
  "realtime.close",
  "observability.metrics",
  "observability.export",
  "observability.setPolicy",
  "observability.replay",
  "observability.cliUsage"
] as const

function win(event: IpcMainInvokeEvent): BrowserWindow {
  const fromSender = BrowserWindow.fromWebContents(event.sender)
  if (!fromSender || fromSender.isDestroyed()) throw new Error("No UI window for this IPC call.")
  return fromSender
}

export function registerAiIpc() {
  ipcMain.handle("ai.generate", (event, raw) =>
    createDesktopRuntime(win(event)).start(AiGenerateInput.parse(raw))
  )
  ipcMain.handle("ai.abort", (_event, raw) => abortGeneration(raw))
  ipcMain.handle("ai.resume", (event, raw) => resumeGeneration(win(event), raw))

  ipcMain.handle("assets.import", (_event, raw) => importAsset(AssetsImportInput.parse(raw)))
  ipcMain.handle("assets.list", () => listImportedAssets())
  ipcMain.handle("assets.read", (_event, raw) => readAssetBytes(AssetsReadInput.parse(raw).id))
  ipcMain.handle("assets.export", (event, raw) =>
    exportAsset(win(event), AssetsExportInput.parse(raw))
  )
  ipcMain.handle("assets.delete", (_event, raw) => removeAsset(AssetsDeleteInput.parse(raw).id))
  ipcMain.handle("assets.upload", (_event, raw) => {
    const input = AssetsUploadInput.parse(raw)
    return uploadAssetToProvider(input)
  })

  ipcMain.handle("knowledge.sources", (_event, raw) =>
    listKnowledgeSources(KnowledgeSourcesInput.parse(raw).workspaceId)
  )
  ipcMain.handle("knowledge.documents", (_event, raw) => {
    const input = KnowledgeDocumentsInput.parse(raw)
    return listKnowledgeDocuments(input.workspaceId, input.sourceId)
  })
  ipcMain.handle("knowledge.addSource", async (_event, raw) => {
    const input = KnowledgeAddSourceInput.parse(raw)
    const source = await addKnowledgeSource(input.workspaceId, input.path)
    if (readPreferences().knowledgeAutoIndex) {
      return indexKnowledgeSource(source.id)
    }
    return source
  })
  ipcMain.handle("knowledge.index", (_event, raw) => {
    const input = KnowledgeIndexInput.parse(raw)
    return indexKnowledgeSource(input.sourceId, input.rebuild)
  })
  ipcMain.handle("knowledge.search", (_event, raw) => {
    const input = KnowledgeSearchInput.parse(raw)
    return searchKnowledge(
      input.workspaceId,
      input.query,
      input.limit,
      input.rerank,
      input.sourceIds
    )
  })
  ipcMain.handle("knowledge.cancel", (_event, raw) => cancelKnowledgeIndex(KnowledgeCancelInput.parse(raw).sourceId))
  ipcMain.handle("knowledge.remove", (_event, raw) => removeKnowledgeSource(KnowledgeRemoveInput.parse(raw).sourceId))

  ipcMain.handle("workflow.list", (_event, raw) => listWorkflows(WorkflowListInput.parse(raw ?? {})))
  ipcMain.handle("workflow.get", (_event, raw) => getWorkflow(WorkflowGetInput.parse(raw).runId))
  ipcMain.handle("workflow.start", (_event, raw) => startWorkflow(WorkflowStartInput.parse(raw)))
  ipcMain.handle("workflow.recover", (_event, raw) => {
    WorkflowRecoverInput.parse(raw ?? {})
    return recoverPausedWorkflows()
  })
  ipcMain.handle("workflow.resume", (_event, raw) => resumeWorkflow(WorkflowResumeInput.parse(raw).runId))
  ipcMain.handle("workflow.cancel", (_event, raw) => cancelWorkflow(WorkflowCancelInput.parse(raw).runId))
  ipcMain.handle("workflow.retry", (_event, raw) => retryWorkflow(WorkflowRetryInput.parse(raw).runId))

  ipcMain.handle("mcp.servers", () => listServers())
  ipcMain.handle("mcp.upsert", (_event, raw) => upsertServer(McpUpsertInput.parse(raw)))
  ipcMain.handle("mcp.remove", (_event, raw) => removeServer(McpIdInput.parse(raw).id))
  ipcMain.handle("mcp.connect", (_event, raw) => connectServer(McpIdInput.parse(raw).id))
  ipcMain.handle("mcp.disconnect", (_event, raw) => disconnectServer(McpIdInput.parse(raw).id))
  ipcMain.handle("mcp.test", (_event, raw) => testServer(McpIdInput.parse(raw).id))
  ipcMain.handle("mcp.tools", (_event, raw) => listServerTools(McpIdInput.parse(raw).id))
  ipcMain.handle("mcp.call", (_event, raw) => {
    const input = McpCallInput.parse(raw)
    return callServerTool(input.id, input.name, input.args)
  })
  ipcMain.handle("mcp.setPermission", (_event, raw) => setPermission(McpSetPermissionInput.parse(raw)))
  ipcMain.handle("mcp.openApp", (_event, raw) => {
    const input = McpOpenAppInput.parse(raw)
    return openMcpApp(input.id, input.resourceUri)
  })
  ipcMain.handle("mcp.appMessage", (_event, raw) => {
    const input = McpAppMessageInput.parse(raw)
    return handleMcpAppMessage(input.id, input.message)
  })

  ipcMain.handle("realtime.open", (event, raw) => openRealtime(win(event), raw))
  ipcMain.handle("realtime.sendAudio", (event, raw) => sendRealtimeAudio(win(event), raw))
  ipcMain.handle("realtime.close", (event, raw) => closeRealtime(win(event), raw))

  ipcMain.handle("observability.metrics", (_event, raw) => queryMetrics(ObservabilityMetricsInput.parse(raw ?? {})))
  ipcMain.handle("observability.export", (_event, raw) => {
    const input = ObservabilityExportInput.parse(raw)
    return { format: input.format, body: exportMetrics(input.format) }
  })
  ipcMain.handle("observability.setPolicy", (_event, raw) => {
    const input = ObservabilitySetPolicyInput.parse(raw)
    setTelemetryPolicy(input.policy, input.otelEndpoint)
    return { ok: true }
  })
  ipcMain.handle("observability.replay", (_event, raw) => {
    const input = ObservabilityReplayInput.parse(raw ?? {})
    return listReplayEvents(input)
  })
  ipcMain.handle("observability.cliUsage", (_event, raw) => {
    ObservabilityCliUsageInput.parse(raw ?? {})
    return collectCliTranscriptUsage()
  })
}

export function unregisterAiIpc() {
  for (const channel of AI_CHANNELS) ipcMain.removeHandler(channel)
}
