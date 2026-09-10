/**
 * Workflow 每一步跑同一条 Agent 循环，不再返回假的 "complete"。
 */
import { BrowserWindow } from "electron"
import { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { runAgent } from "./agent-run-start"
import { waitForRunSettle } from "./agent-run-state"
import { getActiveProfile } from "./secrets"

export async function runWorkflowAgentStep(input: {
  id: string
  label: string
  sessionId: string
  workspaceId: string
  title?: string
}): Promise<string> {
  const window = BrowserWindow.getAllWindows().find((item) => !item.isDestroyed())
  if (!window) throw new Error("Workflow step needs an open window.")
  const profile = await getActiveProfile()
  const prompt = [
    `Workflow step: ${input.label} (${input.id}).`,
    input.title ? `Goal: ${input.title}` : "",
    "Use workspace tools. Finish with a short summary of what you did."
  ]
    .filter(Boolean)
    .join("\n")
  const started = await runAgent(
    window,
    RunAgentInput.parse({
      sessionId: input.sessionId,
      workspaceId: input.workspaceId,
      modelId: profile?.modelId,
      persistUser: false,
      messages: [{ role: "user", content: prompt }]
    })
  )
  const status = await waitForRunSettle(started.runId)
  if (status === "error") return `${input.label} failed`
  return `${input.label} finished (run ${started.runId})`
}
