import assert from "node:assert/strict"
import { test } from "node:test"
import { consumeHandoff, parseHandoffs, peekHandoff, prependHandoffHistory } from "./session-handoff-parse.ts"

test("parseHandoffs 丢掉缺字段的脏数据", () => {
  const all = parseHandoffs(
    JSON.stringify({
      s1: { fromRuntimeId: "claude", toRuntimeId: "cursor", summary: "改 auth" },
      s2: { fromRuntimeId: "claude" }
    })
  )
  assert.equal(all.s1?.summary, "改 auth")
  assert.equal(all.s2, undefined)
})

test("brief 只垫 system，不进用户轮", () => {
  const hidden = "[Engine handoff — hidden context, not a user message]\nSummary: 改 auth"
  const next = prependHandoffHistory([{ role: "user", content: "继续" }], hidden)
  assert.equal(next[0]?.role, "system")
  assert.equal(next[1]?.role, "user")
  assert.equal(next[1]?.content, "继续")
  assert.ok(!next.some((item) => item.role === "user" && String(item.content).includes("Engine handoff")))
})

test("peek 不删；consume 才删；失败路径还能再 peek", () => {
  const row = {
    sessionId: "s1",
    fromRuntimeId: "claude",
    toRuntimeId: "cursor",
    summary: "改 auth"
  }
  const all = { s1: row }
  assert.equal(peekHandoff(all, "s1")?.summary, "改 auth")
  assert.equal(peekHandoff(all, "s1")?.toRuntimeId, "cursor")
  const first = consumeHandoff(all, "s1")
  assert.equal(first.taken?.summary, "改 auth")
  assert.equal(peekHandoff(first.next, "s1"), null)
  const second = consumeHandoff(first.next, "s1")
  assert.equal(second.taken, null)
})

test("空 brief 不改历史", () => {
  const messages = [{ role: "user", content: "继续" }]
  assert.equal(prependHandoffHistory(messages, null)[0]?.role, "user")
})
