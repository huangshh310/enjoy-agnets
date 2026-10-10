/**
 * archive → unarchive 不得改 updated_at，撤销后仍按原活跃时间排。
 */
import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { openDatabase } from "@enjoy-agents/db"
import {
  sessionUpdatedAt,
  stampSessionArchived,
  stampSessionUnarchived
} from "./session-archive-stamp.ts"

function seedSession(updatedAt: number) {
  const db = openDatabase(join(mkdtempSync(join(tmpdir(), "enjoy-archive-")), "app.db"))
  db.prepare(
    "INSERT INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ses-old", "ws", "Seed session 28", updatedAt, updatedAt)
  return db
}

test("归档再恢复不改 updated_at", () => {
  const updatedAt = 1_700_000_000_000
  const db = seedSession(updatedAt)
  assert.equal(stampSessionArchived(db, "ses-old", updatedAt + 60_000), 1)
  assert.equal(sessionUpdatedAt(db, "ses-old"), updatedAt)
  assert.equal(stampSessionUnarchived(db, "ses-old"), 1)
  assert.equal(sessionUpdatedAt(db, "ses-old"), updatedAt)
})

test("归档 SQL 不写 updated_at", () => {
  const source = [
    stampSessionArchived.toString(),
    stampSessionUnarchived.toString()
  ].join("\n")
  assert.match(source, /archived_at/)
  assert.doesNotMatch(source, /updated_at/)
})
