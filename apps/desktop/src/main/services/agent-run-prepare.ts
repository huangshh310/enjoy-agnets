/**
 * hold 之后再编附件、检索知识、开泵。必须在 IPC 已返回 runId 之后跑，
 * 否则知识 embed 一卡住，renderer 没有 runId，Stop 点了没反应。
 */
import { logAndClassifyError } from "@enjoy-agents/agent-core"
import { pumpStream } from "./agent-pump"
import { deleteActiveRun, emitEvent, getActiveRun, holdAgentRun } from "./agent-run-state"
import { appendRunAttachments, attachmentCapsFor } from "./attach-run-files"
import { citeKnowledge } from "./cite-knowledge"

export async function prepareAndPump(runId: string): Promise<void> {
  const run = getActiveRun(runId)
  if (!run || run.abort.signal.aborted) {
    if (run) deleteActiveRun(runId)
    return
  }
  try {
    await appendRunAttachments(
      run.messages,
      run.input.attachments,
      attachmentCapsFor(run.input.modelId, run.secret?.provider)
    )
    if (pumpAborted(runId)) return
    const lastUser = [...run.input.messages].reverse().find((message) => message.role === "user")
    if (lastUser) {
      const cites = await citeKnowledge({
        window: run.window,
        runId,
        sessionId: run.input.sessionId,
        workspaceId: run.input.workspaceId,
        query: lastUser.content
      })
      if (pumpAborted(runId)) return
      run.messages.push(...cites.messages)
      holdAgentRun({ citedSources: cites.sources, runId })
    }
    await pumpStream(runId)
  } catch (error) {
    const current = getActiveRun(runId)
    if (!current) return
    emitEvent(current.window, {
      type: "run.error",
      runId,
      message: logAndClassifyError("prepareAndPump", error).message
    })
    deleteActiveRun(runId)
  }
}

function pumpAborted(runId: string): boolean {
  const run = getActiveRun(runId)
  if (run && !run.abort.signal.aborted) return false
  if (run) deleteActiveRun(runId)
  return true
}
