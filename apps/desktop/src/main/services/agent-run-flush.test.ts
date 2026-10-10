import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CHECKPOINT_INTERVAL_MS,
  flushPayloadFromRun,
  shouldCheckpointPersist,
  type FlushableRun
} from "./agent-run-flush.ts"

function failedHtmlRun(overrides: Partial<FlushableRun> = {}): FlushableRun {
  return {
    assistantPersisted: false,
    sessionId: "ses_1",
    transcript: {
      visible: "登录页已经写好，打开 index.html 就能看。",
      think: "先看项目结构再写文件"
    },
    tools: [
      {
        id: "tool_1",
        name: "write_file",
        state: "output-available",
        args: { path: "index.html" }
      }
    ],
    startedAt: 1,
    extras: {},
    runKind: "agent",
    ...overrides
  }
}

test("rate_limit 失败时仍拿出已生成正文，重启才能 hydrate", () => {
  const payload = flushPayloadFromRun(failedHtmlRun())
  assert.ok(payload)
  assert.match(payload.content, /登录页已经写好/)
  assert.equal(payload.tools[0]?.name, "write_file")
  assert.equal(payload.runKind, "agent")
  assert.equal(payload.reasoning.includes("先看项目结构"), true)
})

test("审批后再泵一轮：累积 transcript 一并落库", () => {
  const payload = flushPayloadFromRun(
    failedHtmlRun({
      transcript: {
        visible: "先写登录页。\n登录页已经写好。",
        think: "step1\nstep2"
      }
    })
  )
  assert.equal(payload?.content.includes("先写登录页"), true)
  assert.equal(payload?.content.includes("登录页已经写好"), true)
})

test("已经落过库仍拿出 payload，同一行 UPDATE 终态工具", () => {
  const payload = flushPayloadFromRun(failedHtmlRun({ assistantPersisted: true }))
  assert.ok(payload)
  assert.equal(payload.tools[0]?.state, "output-available")
})

test("空 transcript 且无工具不落库", () => {
  assert.equal(
    flushPayloadFromRun(
      failedHtmlRun({
        transcript: { visible: "  ", think: "" },
        tools: []
      })
    ),
    null
  )
})

test("tool.result / 审批立刻 checkpoint，text.delta 隔 1.5s", () => {
  assert.equal(shouldCheckpointPersist("tool.result", Date.now(), Date.now()), true)
  assert.equal(shouldCheckpointPersist("approval.required", 1, 1), true)
  assert.equal(shouldCheckpointPersist("text.delta", 1000, 2000), false)
  assert.equal(shouldCheckpointPersist("text.delta", 1000, 1000 + CHECKPOINT_INTERVAL_MS), true)
  assert.equal(shouldCheckpointPersist("reasoning.delta", 0, 2000), true)
  assert.equal(shouldCheckpointPersist("tool.start", 0, 9000), false)
})

test("落库带上本轮 modelId / runtimeId，换模不改旧泡", () => {
  const payload = flushPayloadFromRun(
    failedHtmlRun({ modelId: "opus", runtimeId: "claude" })
  )
  assert.equal(payload?.modelId, "opus")
  assert.equal(payload?.runtimeId, "claude")
})

test("落库带上本轮 runId，下一轮不得盖上一行", () => {
  const payload = flushPayloadFromRun(failedHtmlRun({ runId: "run_2" }))
  assert.equal(payload?.runId, "run_2")
})

test("checkpoint 未封口与已落库都能拿出同一行 payload", () => {
  const payload = flushPayloadFromRun(failedHtmlRun({ assistantPersisted: false }))
  assert.ok(payload)
  const again = flushPayloadFromRun(failedHtmlRun({ assistantPersisted: true }))
  assert.ok(again)
  assert.equal(again.tools[0]?.state, "output-available")
})
