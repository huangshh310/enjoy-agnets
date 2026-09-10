/**
 * 执行自动化：把配方 prompt 交给同一条 Agent 循环。
 */
import type { BrowserWindow } from "electron"
import { RunAgentInput, type Automation, type RunAutomationInput } from "@enjoy-agents/ipc-contract"
import { runAgent } from "./agent-run-start"
import { waitForRunSettle } from "./agent-run-state"
import { readAutomations } from "./automations-store"
import { getActiveProfile } from "./secrets"

export async function runAutomation(window: BrowserWindow, input: RunAutomationInput) {
  const item = readAutomations().find((row) => row.id === input.id)
  if (!item) throw new Error("Automation not found.")
  if (!item.enabled) throw new Error("Automation is disabled.")
  return launchAutomationAgent(window, item, input.sessionId, input.workspaceId)
}

/** 写盘后触发所有已启用的 on_save 配方。 */
export async function fireOnSaveAutomations(
  window: BrowserWindow | undefined,
  workspaceId: string,
  sessionId: string
): Promise<void> {
  if (!window || window.isDestroyed()) return
  const { listActiveRuns } = await import("./agent-run-state")
  if (listActiveRuns().some((item) => item.run.input.sessionId === sessionId)) return
  const jobs = readAutomations().filter((item) => item.enabled && item.trigger === "on_save")
  for (const item of jobs) {
    await launchAutomationAgent(window, item, sessionId, workspaceId)
  }
}

async function launchAutomationAgent(
  window: BrowserWindow,
  item: Automation,
  sessionId: string,
  workspaceId: string
) {
  const profile = await getActiveProfile()
  const payload = RunAgentInput.parse({
    sessionId,
    workspaceId,
    modelId: profile?.modelId,
    persistUser: true,
    messages: [{ role: "user", content: item.prompt }]
  })
  const started = await runAgent(window, payload)
  await waitForRunSettle(started.runId)
  return started
}
