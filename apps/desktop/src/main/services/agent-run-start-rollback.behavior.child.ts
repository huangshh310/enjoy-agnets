/**
 * leo（#135 条件过）：真走 runAgent / resumeAgentRun 开跑 → 开泵前首字前失败（provider_unreachable）。
 * 子进程跑（transform-types）。输出每个场景的库内行 + run.error，父测试断言。
 */
import type { BrowserWindow } from "electron"

process.env.ENJOY_E2E_STUB = "1"
process.env.ENJOY_E2E_USERDATA ||= "/tmp/enjoy-start-rollback"
process.env.ENJOY_E2E_PREPARE_FAIL = "provider_unreachable"

const { getDatabase } = await import("./database.ts")
const { insertRun, getRun } = await import("@enjoy-agents/db")
const { runAgent, resumeAgentRun } = await import("./agent-run-start.ts")
const { getActiveRun, holdAgentRun } = await import("./agent-run-state.ts")

type Ev = { type?: string; runId?: string; preOutput?: boolean; keptUserMessage?: boolean }
const sent: Ev[] = []
const win = {
  isDestroyed: () => false,
  webContents: { isDestroyed: () => false, send: (_c: string, e: Ev) => void sent.push(e) }
} as unknown as BrowserWindow
const { upsertProfile } = await import("./secrets.ts")
// 同 e2e-bootstrap：本机 ollama 桩档案（无需 Key），过选路闸。
await upsertProfile({ name: "E2E Stub", kind: "ollama", modelId: "stub-e2e", models: [{ id: "stub-e2e", label: "E2E Stub" }], activate: true } as never)
const db = getDatabase()
db.prepare("INSERT OR IGNORE INTO workspaces (id,name,root_path,created_at,updated_at) VALUES (?,?,?,?,?)").run("ws_sr", "ws", "/tmp", 1, 1)

function seed(sid: string) {
  db.prepare("INSERT INTO sessions (id,workspace_id,title,created_at,updated_at,workflow_status) VALUES (?,?,?,?,?,?)").run(sid, "ws_sr", "t", 1, 1, "todo")
  db.prepare("INSERT INTO messages (id,session_id,role,content,created_at) VALUES (?,?,?,?,?)").run(`${sid}_u1`, sid, "user", "q1", 10)
  db.prepare("INSERT INTO messages (id,session_id,role,content,created_at) VALUES (?,?,?,?,?)").run(`${sid}_a1`, sid, "assistant", "a1", 11)
}
const rows = (sid: string) =>
  (db.prepare("SELECT id, content FROM messages WHERE session_id=? ORDER BY created_at, id").all(sid) as { id: string; content: string }[])
    .map((r) => `${r.id.replace(`${sid}_`, "")}:${r.content}`)

async function settle(runId: string) {
  for (let i = 0; i < 200 && getActiveRun(runId); i++) await new Promise((r) => setTimeout(r, 10))
  return sent.find((e) => e.type === "run.error" && e.runId === runId)
}

const out: Record<string, unknown> = {};
const base = (sid: string) => ({ sessionId: sid, workspaceId: "ws_sr", modelId: "stub-e2e", mode: "agent" });

// 1 全新一轮（非截断，:284 新插入）：新用户句被回滚。
{
  const sid = "ses_sr_fresh"; seed(sid)
  const r = await runAgent(win, { ...base(sid), messages: [
    { id: `${sid}_u1`, role: "user", content: "q1" }, { id: `${sid}_a1`, role: "assistant", content: "a1" },
    { id: `${sid}_u2`, role: "user", content: "q2" }] }) as { ok: boolean; runId?: string; code?: string }
  const err = r.runId ? await settle(r.runId) : undefined
  out.fresh = { ok: r.ok, code: r.code, rows: rows(sid), err }
}
// 2 重新生成（截断路径 :243，UPDATE 已有 u1）：u1 保留，a1 被截掉不回来。
{
  const sid = "ses_sr_regen"; seed(sid)
  const r = await runAgent(win, { ...base(sid), truncateAfterMessageId: `${sid}_u1`, expectedTailIds: [`${sid}_a1`],
    messages: [{ id: `${sid}_u1`, role: "user", content: "q1" }] }) as { ok: boolean; runId?: string; code?: string }
  const err = r.runId ? await settle(r.runId) : undefined
  out.regen = { ok: r.ok, code: r.code, rows: rows(sid), err }
}
// 3 截断路径新插入（:243 inserted）：在 a1 后接一句新的 → 回滚删掉新句。
{
  const sid = "ses_sr_trunc_new"; seed(sid)
  const r = await runAgent(win, { ...base(sid), truncateAfterMessageId: `${sid}_a1`, expectedTailIds: [],
    messages: [{ id: `${sid}_u1`, role: "user", content: "q1" }, { id: `${sid}_a1`, role: "assistant", content: "a1" },
      { id: `${sid}_u3`, role: "user", content: "q3" }] }) as { ok: boolean; runId?: string; code?: string }
  const err = r.runId ? await settle(r.runId) : undefined
  out.truncNew = { ok: r.ok, code: r.code, rows: rows(sid), err }
}
// 5 非截断路径但用户句已在库（:284 UPDATE，红卡重试同一句）：保留，keptUserMessage=true。
{
  const sid = "ses_sr_retry"; seed(sid)
  db.prepare("INSERT INTO messages (id,session_id,role,content,created_at) VALUES (?,?,?,?,?)").run(`${sid}_u2`, sid, "user", "q2", 12)
  const r = await runAgent(win, { ...base(sid), messages: [
    { id: `${sid}_u1`, role: "user", content: "q1" }, { id: `${sid}_a1`, role: "assistant", content: "a1" },
    { id: `${sid}_u2`, role: "user", content: "q2" }] }) as { ok: boolean; runId?: string; code?: string }
  const err = r.runId ? await settle(r.runId) : undefined
  out.retry = { ok: r.ok, code: r.code, rows: rows(sid), err }
}
// 4 续跑（:274 / :297）：沿用已挂、rollbackEligible=true 的 run → 续跑关掉回滚，库里一行不删，runs 落 failed。
{
  const sid = "ses_sr_resume"; seed(sid)
  const runId = "run_sr_resume"
  insertRun(db, { id: runId, sessionId: sid, workspaceId: "ws_sr", kind: "agent", status: "running", modelId: "stub-e2e", providerId: null, checkpoint: null, error: null })
  holdAgentRun({ runId, window: win, workspaceRoot: "/tmp", messages: [],
    input: { ...base(sid), messages: [{ role: "user", content: "q1" }] } as never, rollbackEligible: true, userMessageId: `${sid}_u1` } as never)
  const r = await resumeAgentRun(win, runId, { sessionId: sid, workspaceId: "ws_sr", modelId: "stub-e2e", messages: [{ role: "user", content: "q1" }] } as never) as { ok: boolean; runId?: string; code?: string }
  const err = r.runId ? await settle(r.runId) : undefined
  out.resume = { ok: r.ok, code: r.code, rows: rows(sid), err, status: (getRun(db, runId) as { status?: string } | undefined)?.status }
}
process.stdout.write(`RESULT ${JSON.stringify(out)}\n`)
process.exit(0)
