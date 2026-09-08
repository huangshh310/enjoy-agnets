import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations } from "../migrations/runner.ts"
import { deleteMessageParts, insertMessageParts, listMessageParts } from "./message-parts.ts"

test("deleteMessageParts 清掉该消息的 parts，不影响其它行", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertMessageParts(db, [
    { id: "prt_1", messageId: "msg_a", idx: 0, type: "text", payload: "{}", createdAt: 1 },
    { id: "prt_2", messageId: "msg_b", idx: 0, type: "text", payload: "{}", createdAt: 1 }
  ])
  deleteMessageParts(db, "msg_a")
  assert.equal(listMessageParts(db, "msg_a").length, 0)
  assert.equal(listMessageParts(db, "msg_b").length, 1)
})
