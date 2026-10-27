/**
 * 纯 helper 测：脏 WAL 下 wipe waiting_review checkpoint；不启 Enjoy。
 */
import assert from "node:assert/strict"
import { mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { openAppDbWalSafe, wipeWaitingReviewCheckpoint } from "./app-db-wal-safe.ts"

test("wipeWaitingReviewCheckpoint：脏 WAL 下清掉 waiting_review 检查点", () => {
  const userData = mkdtempSync(join(tmpdir(), "enjoy-wal-wipe-"))
  try {
    seedDirtyWalDb(join(userData, "app.db"))

    wipeWaitingReviewCheckpoint(userData)

    const db = new DatabaseSync(join(userData, "app.db"))
    try {
      const rows = db
        .prepare("SELECT id, status, checkpoint FROM runs ORDER BY id")
        .all() as Array<{ id: string; status: string; checkpoint: string | null }>
      assert.equal(rows.length, 2)
      const byId = Object.fromEntries(rows.map((row) => [row.id, row]))
      assert.equal(byId["r-wait"]?.checkpoint, null)
      assert.equal(byId["r-done"]?.checkpoint, "keep-me")
    } finally {
      db.close()
    }
  } finally {
    rmSync(userData, { recursive: true, force: true })
  }
})

test("openAppDbWalSafe：checkpoint 后主库可读且可改", () => {
  const userData = mkdtempSync(join(tmpdir(), "enjoy-wal-open-"))
  const dbPath = join(userData, "app.db")
  try {
    seedDirtyWalDb(dbPath)
    const db = openAppDbWalSafe(dbPath)
    try {
      db.exec("UPDATE runs SET checkpoint = NULL WHERE status = 'waiting_review'")
      const waiting = db
        .prepare("SELECT checkpoint FROM runs WHERE id = 'r-wait'")
        .get() as { checkpoint: string | null }
      assert.equal(waiting.checkpoint, null)
    } finally {
      db.close()
    }
    // checkpoint(TRUNCATE) 后 sidecar 应收敛
    const names = readdirSync(userData)
    assert.ok(names.includes("app.db"))
  } finally {
    rmSync(userData, { recursive: true, force: true })
  }
})

test("wipeWaitingReviewCheckpoint：userData 无库时静默跳过", () => {
  const userData = mkdtempSync(join(tmpdir(), "enjoy-wal-empty-"))
  try {
    wipeWaitingReviewCheckpoint(userData)
  } finally {
    rmSync(userData, { recursive: true, force: true })
  }
})

function seedDirtyWalDb(dbPath: string): void {
  const db = new DatabaseSync(dbPath)
  db.exec("PRAGMA journal_mode = WAL;")
  db.exec("PRAGMA wal_autocheckpoint = 0;")
  db.exec("CREATE TABLE runs (id TEXT PRIMARY KEY, status TEXT, checkpoint TEXT);")
  db.exec("INSERT INTO runs (id, status, checkpoint) VALUES ('r-wait', 'waiting_review', 'CK-PAYLOAD');")
  db.exec("INSERT INTO runs (id, status, checkpoint) VALUES ('r-done', 'completed', 'keep-me');")
  // 多写几页，尽量留下 -wal
  for (let i = 0; i < 40; i++) {
    db.exec(`UPDATE runs SET checkpoint = 'CK-${i}' WHERE id = 'r-wait';`)
  }
  db.close()
}
