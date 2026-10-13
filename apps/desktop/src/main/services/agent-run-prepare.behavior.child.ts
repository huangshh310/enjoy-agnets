/**
 * 子进程跑（需 --experimental-transform-types：agent-run-prepare 依赖 harness 的参数属性语法）。
 * 真走 prepareAndPump：附件读不到 → 开泵前抛错 → runs 必须落 failed。输出 JSON 给父测试断言。
 */
import type { BrowserWindow } from "electron"

const L = await import("./session-truncate.behavior.load.ts")
const { getDatabase, holdAgentRun, insertRun, getActiveRun } = L
const { prepareAndPump } = await import("./agent-run-prepare.ts")

const sent: Array<{ type?: string }> = []
const win = {
  isDestroyed: () => false,
  webContents: { isDestroyed: () => false, send: (_c: string, e: { type?: string }) => void sent.push(e) }
} as unknown as BrowserWindow
const db = getDatabase()
const sessionId = "ses_prep_child"
const runId = "run_prep_child"
db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("ws_pc", "ws", "/tmp", 1, 1)
db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(sessionId, "ws_pc", "p", 1, 1)
insertRun(db, { id: runId, sessionId, workspaceId: "ws_pc", kind: "agent", status: "running", modelId: "m", providerId: null, checkpoint: null, error: null })
holdAgentRun({
  runId,
  window: win,
  workspaceRoot: "/tmp",
  messages: [{ role: "user", content: "图" }],
  input: { sessionId, workspaceId: "ws_pc", modelId: "m", mode: "agent", attachments: ["asset_missing_child"], messages: [{ role: "user", content: "图" }] }
})
await prepareAndPump(runId)
const row = db.prepare("SELECT status, error FROM runs WHERE id = ?").get(runId)
process.stdout.write(`RESULT ${JSON.stringify({ row, active: Boolean(getActiveRun(runId)), runError: sent.some((e) => e.type === "run.error") })}\n`)
process.exit(0)
