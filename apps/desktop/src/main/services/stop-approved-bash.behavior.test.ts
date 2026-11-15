/**
 * jojo 产品门 #226@87aa14b0：审批放行后真实 bash 跑着时点停止。
 * decideApproval 在 executeStoredTool 里等 bash；停止先把库写成 cancelled，
 * bash 被杀返回后 decideApproval 不得再把 runs.status 改回 running、把工具封口改回 input-available，
 * 也不得把已开跑的 bash 封成「未执行（cancelled）」——否则这一轮掉回待办、刷新 / 重启后像还在跑。
 */
import assert from "node:assert/strict"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import type { BrowserWindow } from "electron"

const {
  insertRun,
  getRun,
  getDatabase,
  decideApproval,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  abortActiveRunMemory,
  rememberApproval,
  markRestoreWaitingSettled,
  resetRestoreWaitingOnceForTests,
  startedToolCallIds
} = await import("./stop-approved-bash.behavior.load.ts")

type Sent = { type: string; decision?: string; code?: string; toolCallId?: string; phase?: string; turn?: { workflow?: string } }

function recordWindow(events: Sent[]): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: { send: (_ch: string, event: Sent) => void events.push(event) }
  } as unknown as BrowserWindow
}

function toolPart(runId: string): Record<string, unknown> | undefined {
  const rows = getDatabase()
    .prepare("SELECT content FROM messages WHERE role = 'assistant' AND content LIKE ?")
    .all(`%${runId}%`) as Array<{ content: string }>
  const body = rows.at(-1) ? (JSON.parse(rows.at(-1)!.content) as { tools?: Array<Record<string, unknown>> }) : undefined
  return body?.tools?.find((tool) => tool.name === "bash")
}

function workflowOf(sessionId: string): string | null {
  const row = getDatabase().prepare("SELECT workflow_status as w FROM sessions WHERE id = ?").get(sessionId) as
    | { w: string | null }
    | undefined
  return row?.w ?? null
}

async function waitFor(check: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (check()) return true
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  return check()
}

test("审批放行的真实 bash 跑着时停止：库 cancelled、工具封成已停止（非未执行）、这一轮进待验收", async (t) => {
  resetRestoreWaitingOnceForTests()
  markRestoreWaitingSettled()
  const root = mkdtempSync(join(tmpdir(), "enjoy-stop-approved-bash-"))
  const events: Sent[] = []
  const runId = `run_sab_${Date.now()}`
  const sessionId = `ses_sab_${Date.now()}`
  const workspaceId = `ws_sab_${Date.now()}`
  const toolCallId = `tool_sab_${Date.now()}`
  const sdkApprovalId = `apr_sab_${Date.now()}`
  // host.bash 不经 shell 拆词：起一个真 node 子进程，1.5s 后才写盘（与 jojo 的 stop-probe 同形）。
  writeFileSync(join(root, "probe.js"), "setTimeout(() => require('fs').writeFileSync('late.txt', 'late'), 1500)\n")
  const args = { command: "node probe.js" }
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(workspaceId, "ws", root, 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, workspaceId, "stop approved bash", 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId,
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  const plan = rememberApproval({ runId, approvalId: sdkApprovalId, toolCallId, name: "bash", args }) as { id?: string }
  const approvalId = plan.id ?? sdkApprovalId
  const messages = [{ role: "user" as const, content: "run it" }]
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: root,
    messages: [...messages],
    input: { sessionId, workspaceId, modelId: "m", mode: "agent", attachments: [], messages }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  // 不让 decideApproval 末尾真去续泵（没有模型）。
  run.pumping = true
  run.pendingApprovals.push({ approvalId, toolCallId, name: "bash", args })
  run.tools.push({ id: toolCallId, name: "bash", state: "approval-requested", args, argsText: JSON.stringify(args) } as never)
  try {
    const startedAt = Date.now()
    const deciding = decideApproval(recordWindow(events), { runId, toolCallId, approvalId, decision: "allow" }).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error })
    )
    // 等 bash 真过了闸（账本有 started / spawned 条目，executeStoredTool 正在 await host.bash）。
    assert.ok(await waitFor(() => startedToolCallIds(runId).has(toolCallId), 10_000), "bash 过闸开跑")
    await new Promise((resolve) => setTimeout(resolve, 200))
    abortActiveRunMemory(runId)
    const statusRightAfterAbort = getRun(db, runId)?.status
    const decided = await deciding
    const decidedAfterMs = Date.now() - startedAt
    // 有在途工具时终态回执异步落定，等它（或至多 5s）。
    await waitFor(() => events.some((event) => event.type === "run.stopped" && event.phase !== "stuck"), 5_000)
    const finalStatus = getRun(db, runId)?.status
    const part = toolPart(runId)
    const stopped = events.find((event) => event.type === "run.stopped" && event.phase !== "stuck")
    const runError = events.find((event) => event.type === "run.error")
    t.diagnostic(
      JSON.stringify({
        statusRightAfterAbort,
        decidedAfterMs,
        decided: decided.ok ? "resolved" : String((decided as { error: unknown }).error),
        finalStatus,
        toolState: part?.state,
        toolResult: part?.result,
        workflow: workflowOf(sessionId),
        runErrorTurn: runError?.turn,
        stoppedTurn: stopped?.turn,
        eventsAfterAbort: events.slice(events.findIndex((event) => event.type === "run.error")).map((event) => event.type)
      })
    )
    assert.equal(finalStatus, "cancelled", "停止后库里这一轮是 cancelled，不能被 decideApproval 改回 running")
    assert.equal(part?.state, "output-error", "工具封口不得回到 input-available")
    const result = (part?.result ?? {}) as Record<string, unknown>
    assert.equal(result.code, "user_aborted")
    assert.notEqual(result.decision, "cancelled", "已开跑的 bash 不能封成「未执行」")
    assert.equal(workflowOf(sessionId), "needs_review", "被停的 bash 可能改过盘：这一轮进待验收")
    const resolvedAfterStop = events
      .slice(events.findIndex((event) => event.type === "run.error"))
      .some((event) => event.type === "approval.resolved" && event.decision === "allow")
    assert.equal(resolvedAfterStop, false, "停止之后不再推 approval.resolved(allow)，工具行不回魂")
    assert.equal(stopped?.turn?.workflow, "needs_review", "run.stopped 终态的 turn 是待验收")
    // 原本 1.5s 后才写盘的子进程已被杀：等过那个时刻仍没有 late.txt，库也没被改回 running。
    await new Promise((resolve) => setTimeout(resolve, 1_800))
    assert.equal(existsSync(join(root, "late.txt")), false, "停止后零写入")
    assert.equal(getRun(db, runId)?.status, "cancelled")
  } finally {
    deleteActiveRun(runId)
    rmSync(root, { recursive: true, force: true })
  }
})
