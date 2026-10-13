import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { emptySessionToDiscardOnLeave } from "./discard-empty-on-leave.ts"

const base = { sessionId: "ses_a", messages: [], running: false, runId: null, composer: "" }

test("luna P3：离开空「新对话」→ 删", () => {
  assert.equal(emptySessionToDiscardOnLeave(base, "ses_b"), "ses_a")
})

test("有消息 / 在跑 / 输入框有字 / 同会话 / 没会话：不删", () => {
  assert.equal(emptySessionToDiscardOnLeave({ ...base, messages: [{}] }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, running: true }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, runId: "run_1" }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, composer: "稿" }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave(base, "ses_a"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, sessionId: null }, "ses_b"), null)
})

test("接线：loadSession 切走前调 discardEmptySessionOnLeave；main 启动 pruneEmptySessions", () => {
  const life = readFileSync(new URL("./session-lifecycle.ts", import.meta.url), "utf8")
  assert.match(life, /discardEmptySessionOnLeave\(leaving, sessionId\)/)
  const main = readFileSync(new URL("../../../main/index.ts", import.meta.url), "utf8")
  assert.match(main, /pruneEmptySessions\(\)/)
})
