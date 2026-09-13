/**
 * 本机 CLI 工具箱 IPC：目录、探测、覆盖、doctor、安装、登录。
 */
import { catalogFor, isAllowedDocsUrl } from "@enjoy-agents/agent-harness"
import { disposeAcpSession } from "@enjoy-agents/agent-harness"
import {
  AgentToolIdInput,
  DisposeSessionInput,
  DoctorAgentToolInput,
  InspectAgentToolInput,
  LoginAgentToolInput,
  RemoveCustomAgentInput,
  SetHandoffInput,
  SetSessionRuntimeInput,
  UpsertAgentToolInput,
  UpsertCustomAgentInput
} from "@enjoy-agents/ipc-contract"
import { ipcMain, shell } from "electron"
import { inspectAgentTool } from "./services/agent-tools-account/inspect"
import { installAgentTool, loginAgentTool, uninstallAgentTool } from "./services/agent-tools-install"
import { getCustomAgent, removeCustomAgent, upsertCustomAgent } from "./services/agent-tools-custom"
import { writeSessionHandoff } from "./services/session-handoff"
import {
  detectAgentTools,
  doctorAgentTool,
  listAgentTools,
  upsertAgentTool
} from "./services/agent-tools-service"
import { writeSessionRuntime } from "./services/agent-tools-vault"
import { restoreCliConfig, syncCliConfig } from "./services/agent-tools-sync"
export const AGENT_TOOLS_CHANNELS = [
  "agentTools.list",
  "agentTools.detect",
  "agentTools.upsert",
  "agentTools.doctor",
  "agentTools.install",
  "agentTools.login",
  "agentTools.openDocs",
  "agentTools.setSessionRuntime",
  "agentTools.syncConfig",
  "agentTools.restoreConfig",
  "agentTools.uninstall",
  "agentTools.inspect",
  "agentTools.disposeSession",
  "agentTools.setHandoff",
  "agentTools.upsertCustom",
  "agentTools.removeCustom",
  "agentTools.getCustom"
] as const

export function registerAgentToolsIpc() {
  ipcMain.handle("agentTools.list", async () => listAgentTools())
  ipcMain.handle("agentTools.detect", async () => detectAgentTools())
  ipcMain.handle("agentTools.upsert", async (_event, raw: unknown) => {
    const input = UpsertAgentToolInput.parse(raw)
    return upsertAgentTool(input)
  })
  ipcMain.handle("agentTools.doctor", async (_event, raw: unknown) => {
    const input = DoctorAgentToolInput.parse(raw)
    return doctorAgentTool(input.id)
  })
  ipcMain.handle("agentTools.install", async (_event, raw: unknown) => {
    const input = AgentToolIdInput.parse(raw)
    return installAgentTool(input.id)
  })
  ipcMain.handle("agentTools.uninstall", async (_event, raw: unknown) => {
    const input = AgentToolIdInput.parse(raw)
    return uninstallAgentTool(input.id)
  })
  ipcMain.handle("agentTools.login", async (_event, raw: unknown) => {
    const input = LoginAgentToolInput.parse(raw)
    return loginAgentTool(input.id, input.provider)
  })
  ipcMain.handle("agentTools.openDocs", async (_event, raw: unknown) => {
    const input = AgentToolIdInput.parse(raw)
    const url = catalogFor(input.id)?.docsUrl
    if (!url || !isAllowedDocsUrl(url)) return { ok: false as const }
    await shell.openExternal(url)
    return { ok: true as const }
  })
  ipcMain.handle("agentTools.setSessionRuntime", async (_event, raw: unknown) => {
    const input = SetSessionRuntimeInput.parse(raw)
    writeSessionRuntime(input.sessionId, input.runtimeId, input.modelId)
    return { ok: true as const }
  })
  ipcMain.handle("agentTools.syncConfig", async (_event, raw: unknown) => {
    const input = AgentToolIdInput.parse(raw)
    return syncCliConfig(input.id)
  })
  ipcMain.handle("agentTools.restoreConfig", async (_event, raw: unknown) => {
    const input = AgentToolIdInput.parse(raw)
    return restoreCliConfig(input.id)
  })
  ipcMain.handle("agentTools.inspect", async (_event, raw: unknown) => {
    const input = InspectAgentToolInput.parse(raw)
    return inspectAgentTool(input.id, input.refresh)
  })
  ipcMain.handle("agentTools.disposeSession", async (_event, raw: unknown) => {
    const input = DisposeSessionInput.parse(raw)
    await disposeAcpSession(input.sessionId)
    return { ok: true as const }
  })
  ipcMain.handle("agentTools.setHandoff", async (_event, raw: unknown) => {
    const input = SetHandoffInput.parse(raw)
    writeSessionHandoff(input)
    return { ok: true as const }
  })
  ipcMain.handle("agentTools.upsertCustom", async (_event, raw: unknown) => {
    const input = UpsertCustomAgentInput.parse(raw)
    upsertCustomAgent(input)
    return listAgentTools()
  })
  ipcMain.handle("agentTools.removeCustom", async (_event, raw: unknown) => {
    const input = RemoveCustomAgentInput.parse(raw)
    removeCustomAgent(input.id)
    return listAgentTools()
  })
  ipcMain.handle("agentTools.getCustom", async (_event, raw: unknown) => {
    const input = RemoveCustomAgentInput.parse(raw)
    const record = getCustomAgent(input.id)
    if (!record) throw new Error(`Unknown custom agent '${input.id}'.`)
    return record
  })
}
