/**
 * Workflow 每一步跑同一条 Agent 循环：真实产出做摘要，缺档案 fail-fast，
 * 子 run 停车审批时把 waiting_review 传播给 workflow 行。
 */
import { BrowserWindow } from "electron"
import { getRun } from "@enjoy-agents/db"
import { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { runAgent } from "./agent-run-start"
import { waitForRunSettle } from "./agent-run-state"
import { getDatabase } from "./database"
import { getActiveProfile } from "./secrets"

const CHILD_STATUS_POLL_MS = 1000

export async function runWorkflowAgentStep(input: {
  id: string
  label: string
  sessionId: string
  workspaceId: string
  title?: string
  /** 子 run 状态变化回调；workflow 行用它对齐 waiting_review / running。 */
  onChildStatus?: (status: string) => void
  /** 子 agent runId 启动回调；workflow 取消时连带中止。 */
  onChildRun?: (runId: string) => void
}): Promise<string> {
  const window = BrowserWindow.getAllWindows().find((item) => !item.isDestroyed())
  if (!window) throw new Error("Workflow step needs an open window.")
  const profile = await getActiveProfile()
  if (!profile?.apiKey || !profile.modelId) {
    throw new Error("Add a provider API key in Settings before running a workflow.")
  }
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
      modelId: profile.modelId,
      persistUser: false,
      messages: [{ role: "user", content: prompt }]
    })
  )
  input.onChildRun?.(started.runId)
  const poll = input.onChildStatus
    ? setInterval(() => {
        const row = getRun(getDatabase(), started.runId)
        if (row) input.onChildStatus?.(row.status)
      }, CHILD_STATUS_POLL_MS)
    : undefined
  try {
    const settle = await waitForRunSettle(started.runId)
    if (settle.status === "error") {
      throw new Error(settle.summary || `${input.label} failed.`)
    }
    return settle.summary || `${input.label} finished.`
  } finally {
    if (poll) clearInterval(poll)
  }
}
