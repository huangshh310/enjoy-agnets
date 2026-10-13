import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { isFailedItem, settleSupersededErrors } from "./filter-inbox.ts"
import type { InboxNotification } from "../inbox.types.ts"

const note = (status: string, copyKey = "error") => ({ copyKey, status }) as unknown as InboxNotification

test("失败页签只列还没好的：resolved / expired 不算失败（luna #151）", () => {
  assert.equal(isFailedItem(note("active")), true)
  assert.equal(isFailedItem(note("focused")), true)
  assert.equal(isFailedItem(note("resolved")), false)
  assert.equal(isFailedItem(note("expired")), false)
  assert.equal(isFailedItem(note("dismissed")), false)
  assert.equal(isFailedItem(note("active", "complete")), false)
})

test("老档案：错后同会话有更晚的成功，就当已好；别的会话 / 更早的成功不算", () => {
  const items = [
    { id: "a:error", sessionId: "a", kind: "error", status: "active", occurredAt: 1 },
    { id: "a:complete", sessionId: "a", kind: "complete", status: "resolved", occurredAt: 5 },
    { id: "b:error", sessionId: "b", kind: "error", status: "active", occurredAt: 9 },
    { id: "b:complete", sessionId: "b", kind: "complete", status: "resolved", occurredAt: 3 },
    { id: "c:error", sessionId: "c", kind: "error", status: "active", occurredAt: 1 }
  ]
  const out = settleSupersededErrors(items)
  assert.equal(out[0]!.status, "resolved")
  assert.equal(out[2]!.status, "active")
  assert.equal(out[4]!.status, "active")
})

test("耐久层：状态变了（出错 → resolved）也重写档案，重启后收件箱不复活", () => {
  const src = readFileSync(new URL("../../../stores/attention/persist-attention.ts", import.meta.url), "utf8")
  assert.match(src, /\$\{item\.id\}:\$\{item\.occurredAt\}:\$\{item\.status\}/)
  const inbox = readFileSync(new URL("../use-inbox.ts", import.meta.url), "utf8")
  assert.match(inbox, /settleSupersededErrors\(\[/)
})
