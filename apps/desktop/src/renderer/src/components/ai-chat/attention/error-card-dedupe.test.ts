import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { hiddenByErrorCard } from "./error-card-dedupe.ts"

const on = { isChat: true, sessionId: "a", errorCardVisible: true }

test("本会话红卡在场：同会话出错项不上需处理条", () => {
  assert.equal(hiddenByErrorCard({ kind: "error", sessionId: "a" }, on), true)
})
test("别的会话出错、审批项、红卡不在、非聊天页：照常显示", () => {
  assert.equal(hiddenByErrorCard({ kind: "error", sessionId: "b" }, on), false)
  assert.equal(hiddenByErrorCard({ kind: "pending_approval", sessionId: "a" }, on), false)
  assert.equal(hiddenByErrorCard({ kind: "error", sessionId: "a" }, { ...on, errorCardVisible: false }), false)
  assert.equal(hiddenByErrorCard({ kind: "error", sessionId: "a" }, { ...on, isChat: false }), false)
})
test("需处理条接上了红卡去重", () => {
  const src = readFileSync(new URL("./attention-strip.tsx", import.meta.url), "utf8")
  assert.match(src, /hiddenByErrorCard\(/)
})
