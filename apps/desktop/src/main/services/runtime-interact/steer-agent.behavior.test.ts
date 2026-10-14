/**
 * leo #155：直接调 steerAgent（真库 + 真资产库）——带图纠偏落库的用户句必须带 file part。
 * 守住 steer-agent.ts 把 attached 接进 persistUserTurn 那一行（只测 performSteer 守不住）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { getDatabase } = await import("../restore-interrupted-running.behavior.load.ts")
const { importAsset } = await import("../asset-service.ts")
const { holdAgentRun, deleteActiveRun } = await import("../agent-run-state.ts")
const { steerAgent } = await import("./steer-agent.ts")
const { drainSteer } = await import("./steering-queue.ts")

const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

test("steerAgent 带图：落库的用户句有 file part（assetId 对得上）", async () => {
  const db = getDatabase()
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("ws_st", "ws", "/tmp", 1, 1)
  db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("ses_st", "ws_st", "t", 1, 1)
  const asset = await importAsset({ name: "steer.png", mediaType: "image/png", bytesBase64: PNG_1PX })
  holdAgentRun({
    runId: "run_st",
    window: {} as never,
    input: { sessionId: "ses_st", workspaceId: "ws_st", modelId: "gpt-4o", messages: [], attachments: [], mode: "agent", runtimeId: "enjoy-local" } as never,
    workspaceRoot: "/tmp",
    messages: []
  })
  try {
    await steerAgent({} as never, { sessionId: "ses_st", runId: "run_st", text: "看这张", attachments: [asset.id] })
    const row = db
      .prepare("SELECT id FROM messages WHERE session_id = ? AND role = 'user' AND content = ?")
      .get("ses_st", "看这张") as { id: string } | undefined
    assert.ok(row, "纠偏句已落库")
    const parts = db
      .prepare("SELECT type, payload FROM message_parts WHERE message_id = ?")
      .all(row.id) as Array<{ type: string; payload: string }>
    const files = parts.filter((p) => p.type === "file").map((p) => JSON.parse(p.payload) as { assetId?: string })
    assert.deepEqual(files.map((f) => f.assetId), [asset.id], "用户句带着这张图的 file part")
  } finally {
    drainSteer("ses_st")
    deleteActiveRun("run_st")
  }
})
