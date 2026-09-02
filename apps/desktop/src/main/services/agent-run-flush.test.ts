import assert from "node:assert/strict"
import { test } from "node:test"
import { flushPayloadFromRun, type FlushableRun } from "./agent-run-flush.ts"

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

test("已经落过库不再插第二行", () => {
  assert.equal(flushPayloadFromRun(failedHtmlRun({ assistantPersisted: true })), null)
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
