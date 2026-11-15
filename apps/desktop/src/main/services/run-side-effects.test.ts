/**
 * 副作用账本状态机、abort 有在途 / 无在途分支、「再停一次」rekill、通知时机。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { mkdtemp, access, rm, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { constants as fsConstants } from "node:fs"
import type { BrowserWindow } from "electron"
import { Notification } from "electron"
import { abortActiveRunMemory } from "./abort-active-run.ts"
import { getActiveRun, holdAgentRun } from "./agent-run-state.ts"
import { notifyAgentEvent, stopReceiptNotifyCopy } from "./desktop-notify.ts"
import {
  begin,
  blocked,
  hasUnsettled,
  latestDeadlineAt,
  markBlocked,
  onRekill,
  rekill,
  resetRunSideEffectsForTest,
  settle,
  spawned,
  summarize,
  waitSettled,
  ledgerSizeForTest,
  reclaimLedgerIfIdle,
  setKillTreeForTest,
  markChildExited
} from "./run-side-effects.ts"
import { settleRun } from "./agent-run-state.ts"
import { createWorkspaceHost } from "./workspace-host.ts"
import { resetTreeLivenessForTest, setTreeLivenessOverride, setTreeLivenessPlatformForTest } from "./command.ts"
import { decideStopReceipt } from "./stop-receipt-decide.ts"
import { createSshWorkspaceHost } from "./ssh/ssh-workspace-host.ts"
import type { SshConnectionLayer } from "./ssh/ssh.types.ts"
import { isRemoteDisconnected } from "./ssh/ssh-errors.ts"

const NotificationStub = Notification as unknown as {
  supported: boolean
  shown: Array<{ title?: string; body?: string }>
  resetForTest: () => void
}

afterEach(() => {
  resetRunSideEffectsForTest()
  resetTreeLivenessForTest()
  NotificationStub.resetForTest?.()
})

function fakeWindow(events: unknown[]): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: {
      send(_ch: string, event: unknown) {
        events.push(event)
      }
    }
  } as unknown as BrowserWindow
}

function holdRun(runId: string, sessionId: string, events: unknown[]) {
  holdAgentRun({
    runId,
    window: fakeWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_stop_e1",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "hi" }]
    }
  })
}

test("账本：blocked / started / spawned / settled / deadline / rekill hook", async () => {
  const blockedEntry = blocked("write_file", { runId: "r1", toolCallId: "t1", toolTimeoutMs: 1_000 })
  assert.equal(blockedEntry.phase, "blocked_before_start")
  assert.equal(hasUnsettled("r1"), false)

  const started = begin("bash", { runId: "r2", toolCallId: "t2", toolTimeoutMs: 1_000 })
  assert.equal(started.phase, "started")
  assert.equal(started.deadlineAt, started.startedAt + 1_000 + 2_000)
  assert.equal(hasUnsettled("r2"), true)
  spawned(started.id, 4242)
  assert.equal(summarize("r2")[0]?.phase, "spawned")
  assert.equal(summarize("r2")[0]?.pid, 4242)
  let rekilled = false
  onRekill("r2", () => {
    rekilled = true
    settle(started.id, "killed")
  })
  const waiting = waitSettled("r2")
  await rekill("r2")
  await waiting
  assert.equal(rekilled, true)
  assert.equal(hasUnsettled("r2"), false)
  assert.ok((latestDeadlineAt("r2") ?? 0) >= started.deadlineAt)
})

test("markBlocked 把已 begin 未写的条目收成 blocked_before_start", () => {
  const entry = begin("stub_write", { runId: "r3", toolCallId: "t3" })
  markBlocked(entry.id)
  assert.equal(summarize("r3")[0]?.phase, "blocked_before_start")
  assert.equal(hasUnsettled("r3"), false)
})

test("abortActiveRunMemory：无在途时与现网一致（立刻 persist turn，不带 settling）", () => {
  const events: Array<Record<string, unknown>> = []
  holdRun("run_no_pending", "ses_no_pending", events)
  const before = getActiveRun("run_no_pending")
  assert.ok(before)
  abortActiveRunMemory("run_no_pending")
  assert.equal(getActiveRun("run_no_pending"), undefined)
  const error = events.find((item) => item.type === "run.error")
  assert.ok(error)
  assert.equal(error.code, "user_aborted")
  assert.equal(error.settling, undefined)
  assert.ok(error.turn)
  assert.equal((error.turn as { attention?: string }).attention, "stopped")
  assert.equal(error.preOutput, false)
  assert.ok(!events.some((item) => item.type === "run.stopped"))
})

test("abortActiveRunMemory：有在途时立刻发 run.error(settling) 且带 stopRequestedAt，不带 turn", () => {
  const events: Array<Record<string, unknown>> = []
  holdRun("run_settling", "ses_settling", events)
  const entry = begin("bash", { runId: "run_settling", toolCallId: "c1", toolTimeoutMs: 5_000 })
  spawned(entry.id, 99)
  setTreeLivenessOverride(99, true)
  const t0 = Date.now()
  abortActiveRunMemory("run_settling")
  assert.equal(getActiveRun("run_settling"), undefined)
  const error = events.find((item) => item.type === "run.error")
  assert.ok(error)
  assert.equal(error.code, "user_aborted")
  assert.equal(error.turn, undefined)
  const settling = error.settling as { deadlineAt: number; stopRequestedAt?: number }
  assert.ok(settling)
  assert.ok(typeof settling.deadlineAt === "number")
  assert.ok(typeof settling.stopRequestedAt === "number")
  assert.ok(settling.stopRequestedAt >= t0 - 20)
  assert.ok(settling.stopRequestedAt <= Date.now())
  assert.equal(hasUnsettled("run_settling"), true)
})

test("再停一次：deleteActiveRun 之后再 abort 走 rekill，不等待 settle", async () => {
  const events: Array<Record<string, unknown>> = []
  holdRun("run_rekill", "ses_rekill", events)
  const entry = begin("bash", { runId: "run_rekill", toolCallId: "c1", toolTimeoutMs: 30_000 })
  spawned(entry.id, 99)
  setTreeLivenessOverride(99, true)
  abortActiveRunMemory("run_rekill")
  assert.equal(getActiveRun("run_rekill"), undefined)
  let hookAt = 0
  onRekill("run_rekill", () => {
    hookAt = Date.now()
    settle(entry.id, "killed")
  })
  const started = Date.now()
  const returned = abortActiveRunMemory("run_rekill")
  const elapsed = Date.now() - started
  assert.equal(returned, undefined)
  assert.ok(elapsed < 50, `handler must not await settle, took ${elapsed}ms`)
  assert.ok(hookAt > 0)
})

test("未知 runId：既不在 activeRuns 也不在账本时 no-op", () => {
  const events: Array<Record<string, unknown>> = []
  const returned = abortActiveRunMemory("run_unknown_e1")
  assert.equal(returned, undefined)
  assert.equal(getActiveRun("run_unknown_e1"), undefined)
  assert.equal(events.length, 0)
  assert.equal(hasUnsettled("run_unknown_e1"), false)
})

test("abortActiveRunMemory 有在途时同步返回，不 await waitSettled", () => {
  const events: Array<Record<string, unknown>> = []
  holdRun("run_no_await", "ses_no_await", events)
  begin("write_file", { runId: "run_no_await", toolTimeoutMs: 30_000 })
  const started = Date.now()
  abortActiveRunMemory("run_no_await")
  const elapsed = Date.now() - started
  assert.ok(elapsed < 50, `must return without awaiting settle, took ${elapsed}ms`)
  assert.equal(hasUnsettled("run_no_await"), true)
})

test("有在途时终态 run.stopped 才发通知；settling 的 run.error 不通知", () => {
  NotificationStub.resetForTest()
  NotificationStub.supported = true
  notifyAgentEvent({
    type: "run.error",
    runId: "r",
    message: "Aborted by user.",
    code: "user_aborted",
    settling: { deadlineAt: Date.now() + 10_000, stopRequestedAt: Date.now() }
  })
  assert.equal(NotificationStub.shown.length, 0)

  notifyAgentEvent({
    type: "run.error",
    runId: "r2",
    message: "Aborted by user.",
    code: "user_aborted"
  })
  assert.equal(NotificationStub.shown.length, 1)
  assert.equal(NotificationStub.shown[0]?.title, "已停止")

  NotificationStub.shown.length = 0
  notifyAgentEvent({
    type: "run.stopped",
    runId: "r",
    sessionId: "s",
    phase: "stuck",
    receipt: { write: "maybe_partial", tools: [] }
  })
  assert.equal(NotificationStub.shown.length, 0)

  notifyAgentEvent({
    type: "run.stopped",
    runId: "r",
    sessionId: "s",
    phase: "final",
    receipt: { write: "maybe_partial", tools: [] }
  })
  assert.equal(NotificationStub.shown.length, 1)
  assert.equal(NotificationStub.shown[0]?.title, "已停止 · 可能只做了一半")
})

test("通知文案与落定三句对齐", () => {
  assert.equal(stopReceiptNotifyCopy("none_confirmed", true).title, "已停止 · 没有写入")
  assert.equal(stopReceiptNotifyCopy("maybe_partial", true).title, "已停止 · 可能只做了一半")
  assert.equal(stopReceiptNotifyCopy("completed", true).title, "已停止")
})

test("写盘闸：signal 已中止则不写盘，账本记 blocked_before_start", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-gate-"))
  const abort = new AbortController()
  abort.abort()
  const host = createWorkspaceHost(root, { runId: "run_gate", sessionId: "ses_gate", signal: abort.signal })
  const target = join(root, "nope.txt")
  await assert.rejects(() => host.writeFile("nope.txt", "x"), (error: unknown) => {
    return error instanceof Error && error.name === "AbortError"
  })
  await assert.rejects(() => access(target, fsConstants.F_OK))
  const rows = summarize("run_gate")
  assert.equal(rows[0]?.phase, "blocked_before_start")
  assert.equal(rows[0]?.op, "write_file")
  await rm(root, { recursive: true, force: true })
})

test("写盘闸放行时写入成功并记 ok，checkpoint 用绑定的 runId", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-gate-ok-"))
  const host = createWorkspaceHost(root, { runId: "run_ok", sessionId: "ses_ok" })
  await host.writeFile("ok.txt", "hello")
  assert.equal(await readFile(join(root, "ok.txt"), "utf8"), "hello")
  const rows = summarize("run_ok")
  assert.equal(rows[0]?.phase, "settled")
  assert.equal(rows[0]?.outcome, "ok")
  await rm(root, { recursive: true, force: true })
})

test("rekill 只杀还没 settle 的已启动条目，不碰已退出的 pid", async () => {
  const done = begin("bash", { runId: "run_pid_reuse", toolCallId: "old" })
  spawned(done.id, 111)
  settle(done.id, "exited")
  const live = begin("bash", { runId: "run_pid_reuse", toolCallId: "new" })
  spawned(live.id, 222)
  const killed: number[] = []
  setKillTreeForTest(async (pid) => {
    killed.push(pid)
  })
  await rekill("run_pid_reuse")
  assert.deepEqual(killed, [222])
  setKillTreeForTest()
})

test("沙箱拒绝之后再停止：账本无在途，与现网立刻停止一致", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-sandbox-deny-"))
  const events: Array<Record<string, unknown>> = []
  holdRun("run_sandbox_deny", "ses_sandbox_deny", events)
  const host = createWorkspaceHost(root, {
    runId: "run_sandbox_deny",
    sessionId: "ses_sandbox_deny"
  })
  await assert.rejects(() => host.bash("curl https://example.com"), /Sandbox network is disabled/)
  assert.equal(hasUnsettled("run_sandbox_deny"), false)
  const rows = summarize("run_sandbox_deny")
  assert.equal(rows.length, 0)
  abortActiveRunMemory("run_sandbox_deny")
  const error = events.find((item) => item.type === "run.error")
  assert.ok(error)
  assert.equal(error.code, "user_aborted")
  assert.equal(error.settling, undefined)
  assert.ok(error.turn)
  assert.ok(!events.some((item) => item.type === "run.stopped"))
  await rm(root, { recursive: true, force: true })
})

test("正常结束且无未结清条目时回收账本", () => {
  const entry = begin("write_file", { runId: "run_reclaim" })
  settle(entry.id, "ok")
  assert.equal(ledgerSizeForTest(), 1)
  settleRun("run_reclaim", { status: "end", summary: "ok" })
  assert.equal(ledgerSizeForTest(), 0)
  const busy = begin("bash", { runId: "run_keep" })
  spawned(busy.id, 9)
  assert.equal(hasUnsettled("run_keep"), true)
  const size = ledgerSizeForTest()
  reclaimLedgerIfIdle("run_keep")
  assert.equal(ledgerSizeForTest(), size)
})


function receiptOf(runId: string) {
  return decideStopReceipt({ entries: summarize(runId), phase: "settled" })
}

test("写入中途出错后回执是 maybe_partial，证据为 fs_write_error", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-write-err-"))
  await writeFile(join(root, "afile"), "not a dir")
  const host = createWorkspaceHost(root, { runId: "run_write_err", sessionId: "ses_write_err" })
  await assert.rejects(() => host.writeFile("afile/child.txt", "x"))
  const rows = summarize("run_write_err")
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.op, "write_file")
  assert.equal(rows[0]?.phase, "settled")
  assert.equal(rows[0]?.outcome, "error")
  const receipt = receiptOf("run_write_err")
  assert.equal(receipt.write, "maybe_partial")
  assert.ok(receipt.tools.some((tool) => tool.evidence.includes("fs_write_error")))
  await rm(root, { recursive: true, force: true })
})

test("git commit / branch / push 开始后失败，回执是 maybe_partial 不是 none_confirmed", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-git-err-"))
  const host = createWorkspaceHost(root, { runId: "run_git_err", sessionId: "ses_git_err" })
  await assert.rejects(() => host.gitBranch("feat-n1"))
  await assert.rejects(() => host.gitPush())
  const branch = summarize("run_git_err").find((row) => row.op === "git_branch")
  const push = summarize("run_git_err").find((row) => row.op === "git_push")
  assert.equal(branch?.phase, "settled")
  assert.equal(branch?.outcome, "error")
  assert.equal(push?.phase, "settled")
  assert.equal(push?.outcome, "error")
  const receipt = receiptOf("run_git_err")
  assert.equal(receipt.write, "maybe_partial")
  assert.notEqual(receipt.write, "none_confirmed")

  const commitRoot = await mkdtemp(join(tmpdir(), "enjoy-git-commit-err-"))
  const { execFileSync } = await import("node:child_process")
  execFileSync("git", ["init"], { cwd: commitRoot })
  const commitHost = createWorkspaceHost(commitRoot, { runId: "run_git_commit", sessionId: "ses_git_commit" })
  await assert.rejects(() => commitHost.gitCommit("msg", { stageAll: true }))
  const commit = summarize("run_git_commit")
  assert.equal(commit[0]?.op, "git_commit")
  assert.equal(commit[0]?.phase, "settled")
  assert.equal(commit[0]?.outcome, "error")
  assert.equal(receiptOf("run_git_commit").write, "maybe_partial")
  await rm(root, { recursive: true, force: true })
  await rm(commitRoot, { recursive: true, force: true })
})

test("MCP 请求发出后报错，回执是 maybe_partial", () => {
  const entry = begin("mcp", { runId: "run_mcp_err", toolCallId: "mcp1", external: "mcp" })
  settle(entry.id, "error")
  const receipt = receiptOf("run_mcp_err")
  assert.equal(receipt.write, "maybe_partial")
  assert.ok(receipt.tools.some((tool) => tool.evidence.includes("external_unverifiable")))
})

test("Windows：子进程已退出的条目 rekill 跳过，避免误杀复用 pid", async () => {
  setTreeLivenessPlatformForTest("win32")
  const exited = begin("bash", { runId: "run_win_reuse", toolCallId: "old" })
  spawned(exited.id, 333)
  markChildExited(exited.id)
  const live = begin("bash", { runId: "run_win_reuse", toolCallId: "new" })
  spawned(live.id, 444)
  const killed: number[] = []
  setKillTreeForTest(async (pid) => {
    killed.push(pid)
  })
  await rekill("run_win_reuse")
  assert.deepEqual(killed, [444])
  setKillTreeForTest()
})

test("路径越界之后再停止：账本无在途，与现网立刻停止一致", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-path-escape-"))
  const events: Array<Record<string, unknown>> = []
  holdRun("run_path_escape", "ses_path_escape", events)
  const host = createWorkspaceHost(root, {
    runId: "run_path_escape",
    sessionId: "ses_path_escape"
  })
  await assert.rejects(() => host.writeFile("../outside.txt", "x"), /Path escapes the workspace/)
  assert.equal(hasUnsettled("run_path_escape"), false)
  assert.equal(summarize("run_path_escape").length, 0)
  abortActiveRunMemory("run_path_escape")
  const error = events.find((item) => item.type === "run.error")
  assert.ok(error)
  assert.equal(error.code, "user_aborted")
  assert.equal(error.settling, undefined)
  assert.ok(error.turn)
  assert.ok(!events.some((item) => item.type === "run.stopped"))
  await rm(root, { recursive: true, force: true })
})

function fakeSshConn(status: SshConnectionLayer["status"] = "connected"): SshConnectionLayer {
  const files = new Map<string, string>([["/home/alice/app/readme.md", "hi"]])
  const conn: SshConnectionLayer = {
    status,
    ping: async () => "ok",
    exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    readFile: async (abs) => {
      const value = files.get(abs)
      if (value == null) throw new Error(`无此路径: ${abs}`)
      return value
    },
    writeFile: async (abs, content) => {
      files.set(abs, content)
    },
    listDir: async () => [{ name: "readme.md", kind: "file" }],
    dispose: () => {
      conn.status = "disconnected"
    }
  }
  return conn
}

test("SSH 断线之后再停止：账本无在途，与现网立刻停止一致", async () => {
  const events: Array<Record<string, unknown>> = []
  holdRun("run_ssh_disc", "ses_ssh_disc", events)
  const host = createSshWorkspaceHost(fakeSshConn("disconnected"), "/home/alice/app", {
    runId: "run_ssh_disc",
    sessionId: "ses_ssh_disc"
  })
  await assert.rejects(() => host.writeFile("readme.md", "x"), (error: unknown) => isRemoteDisconnected(error))
  assert.equal(hasUnsettled("run_ssh_disc"), false)
  assert.equal(summarize("run_ssh_disc").length, 0)
  abortActiveRunMemory("run_ssh_disc")
  const error = events.find((item) => item.type === "run.error")
  assert.ok(error)
  assert.equal(error.code, "user_aborted")
  assert.equal(error.settling, undefined)
  assert.ok(error.turn)
  assert.ok(!events.some((item) => item.type === "run.stopped"))
})
