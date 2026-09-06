/**
 * 本机 CLI 工具箱 IPC：目录、探测、覆盖、doctor、安装、登录。
 */
import { catalogFor, isAllowedDocsUrl } from "@enjoy-agents/agent-harness"
import {
  AgentToolIdInput,
  DoctorAgentToolInput,
  SetSessionRuntimeInput,
  UpsertAgentToolInput
} from "@enjoy-agents/ipc-contract"
import { ipcMain, shell } from "electron"
import { installAgentTool, loginAgentTool } from "./services/agent-tools-install"
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
  "agentTools.restoreConfig"
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
  ipcMain.handle("agentTools.login", async (_event, raw: unknown) => {
    const input = AgentToolIdInput.parse(raw)
    return loginAgentTool(input.id)
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
    writeSessionRuntime(input.sessionId, input.runtimeId)
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
}
