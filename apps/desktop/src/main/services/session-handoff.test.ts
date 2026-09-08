import assert from "node:assert/strict"
import { test } from "node:test"
import { parseHandoffs, prependHandoffHistory } from "./session-handoff-parse.ts"

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

test("空 brief 不改历史", () => {
  const messages = [{ role: "user", content: "继续" }]
  assert.equal(prependHandoffHistory(messages, null)[0]?.role, "user")
})
