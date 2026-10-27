import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import type { AppDatabase } from "../client.ts"
import { applyMigrations } from "../migrations/runner.ts"
import {
  deleteMessageParts,
  groupMessageParts,
  insertMessageParts,
  listMessageParts,
  listMessagePartsForSession
} from "./message-parts.ts"

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

test("一个会话的 parts 只 prepare 一次，且与逐条查询同序", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  const insertMessage = db.prepare(
    "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
  )
  insertMessage.run("m1", "ses", "user", "a", 1)
  insertMessage.run("m2", "ses", "assistant", "b", 2)
  insertMessage.run("m9", "other", "user", "z", 3)
  insertMessageParts(db, [
    { id: "p2", messageId: "m1", idx: 1, type: "text", payload: "{\"t\":2}", createdAt: 1 },
    { id: "p1", messageId: "m1", idx: 0, type: "text", payload: "{\"t\":1}", createdAt: 1 },
    { id: "p3", messageId: "m2", idx: 0, type: "text", payload: "{\"t\":3}", createdAt: 1 },
    { id: "p4", messageId: "m9", idx: 0, type: "text", payload: "{}", createdAt: 1 }
  ])
  const counted = countPrepares(db)
  const rows = listMessagePartsForSession(counted.db, "ses")
  assert.equal(counted.count(), 1)
  const grouped = groupMessageParts(rows)
  assert.deepEqual(
    grouped.get("m1")?.map((part) => part.id),
    listMessageParts(db, "m1").map((part) => part.id)
  )
  assert.deepEqual(grouped.get("m1")?.map((part) => part.idx), [0, 1])
  assert.deepEqual(grouped.get("m2")?.map((part) => part.payload), ["{\"t\":3}"])
  assert.equal(grouped.has("m9"), false)
})

/** 包一层只为数 prepare。native 方法仍绑在原库上。 */
function countPrepares(db: DatabaseSync): { db: AppDatabase; count: () => number } {
  let prepares = 0
  const wrapped = new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === "prepare") {
        return (sql: string) => {
          prepares += 1
          return target.prepare(sql)
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === "function" ? value.bind(target) : value
    }
  })
  return { db: wrapped as AppDatabase, count: () => prepares }
}
