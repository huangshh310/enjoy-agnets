/**
 * 开一轮：当前工作区 + 规则里的引擎/模型/模式 + 提示词，走现 runAgent。
 */
import type { BrowserWindow } from "electron"
import { isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { RunAgentInput, type Automation, type AutomationRunSource } from "@enjoy-agents/ipc-contract"
import { applyAutomationHostMode, resolveAutomationMode } from "./automations-mode"
import { runAgent } from "./agent-run-start"
import { writeSessionRuntime } from "./agent-tools-vault"
import { createId } from "./ids"
import { getSetting } from "./database"
import { readPreferences } from "./preferences"
import { getActiveProfile } from "./secrets"
import { createSession } from "./session-queries"
import { listWorkspaces } from "./workspace"

export { applyAutomationHostMode, resolveAutomationMode }

export async function resolveAutomationWorkspaceId(explicit?: string): Promise<string> {
  if (explicit?.trim()) return explicit.trim()
  const last = getSetting("lastWorkspaceId")?.trim()
  if (last) return last
  const first = (await listWorkspaces())[0]
  if (!first) throw new Error("No workspace open.")
  return first.id
}

export function resolveAutomationRuntimeId(item: Automation): string {
  return item.runtimeId?.trim() || readPreferences().runtimeId || "enjoy-local"
}

export async function resolveAutomationModelId(item: Automation, runtimeId: string): Promise<string> {
  if (item.modelId?.trim()) return item.modelId.trim()
  if (isAcpHostRuntime(runtimeId)) return ""
  const profile = await getActiveProfile()
  return profile?.modelId ?? ""
}

export async function openAutomationSession(
  item: Automation,
  workspaceId: string,
  reuseSessionId?: string
) {
  if (reuseSessionId) return { sessionId: reuseSessionId, workspaceId }
  const session = await createSession(workspaceId, item.name)
  return { sessionId: session.id, workspaceId }
}

export type StartAutomationRunOpts = {
  commandId?: string
  denyAnyDesktop?: boolean
  automationSource?: AutomationRunSource
}

export async function startAutomationRun(
  window: BrowserWindow,
  item: Automation,
  sessionId: string,
  workspaceId: string,
  opts: StartAutomationRunOpts = {}
) {
  const runtimeId = resolveAutomationRuntimeId(item)
  const mode = resolveAutomationMode(item.mode)
  const modelId = await resolveAutomationModelId(item, runtimeId)
  writeSessionRuntime(sessionId, runtimeId, modelId || undefined)
  const prompt = applyAutomationHostMode(isAcpHostRuntime(runtimeId), mode, item.prompt)
  const payload = RunAgentInput.parse({
    sessionId,
    workspaceId,
    modelId,
    runtimeId,
    mode,
    persistUser: true,
    commandId: opts.commandId ?? createId("auto-run"),
    denyAnyDesktop: opts.denyAnyDesktop === true ? true : undefined,
    automationSource: opts.automationSource,
    messages: [{ role: "user", content: prompt }]
  })
  return runAgent(window, payload)
}
