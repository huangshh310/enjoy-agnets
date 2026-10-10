import assert from "node:assert/strict"
import { test } from "node:test"
import {
  APPROVAL_REPLAY_DENIED,
  APPROVAL_REPLAY_DENIED_COPY,
  isToolNotExecuted
} from "@enjoy-agents/ipc-contract/approval-not-executed"
import { dedupeConsecutiveUserTurns } from "./dedupe-user-turns.ts"
import { threadFromRows } from "./hydrate-thread.ts"
import { mapAssistantThreadMessage } from "./hydrate-thread-map.ts"
import { mapToolStatus } from "../components/ai-chat/thread/thinking/extract-step-fields.ts"

test("相邻相同用户句只留一条", () => {
  const rows = dedupeConsecutiveUserTurns([
    { role: "user", content: "重新优化一下当前太丑了" },
    { role: "user", content: "重新优化一下当前太丑了" },
    { role: "assistant", content: "好" }
  ])
  assert.equal(rows.length, 2)
  assert.equal(rows[0]?.role, "user")
  assert.equal(rows[1]?.role, "assistant")
})

test("hydrate 映射恢复生图 runKind，不看当前 picker", () => {
  const message = mapAssistantThreadMessage(
    { id: "msg_1", content: "", createdAt: 1 },
    {
      v: 1,
      content: "",
      runKind: "image",
      assets: [{ assetId: "ast_1", mediaType: "image/png", name: "shot.png" }]
    },
    { sources: [], assets: [], components: [] },
    []
  )
  assert.equal(message.runKind, "image")
  assert.equal(message.assets?.[0]?.assetId, "ast_1")
})

test("hydrate 恢复轮末引导词", () => {
  const message = mapAssistantThreadMessage(
    { id: "msg_chip", content: "好了", createdAt: 1 },
    {
      v: 1,
      content: "好了",
      actionChips: [{ id: "chip_0", label: "补测试", prompt: "请补单测", actionType: "queue" }]
    },
    { sources: [], assets: [], components: [] },
    []
  )
  assert.equal(message.actionChips?.[0]?.label, "补测试")
})

test("hydrate 恢复本轮模型 stamp，不看当前 picker", () => {
  const message = mapAssistantThreadMessage(
    { id: "msg_3", content: "ok", createdAt: 1 },
    { v: 1, content: "ok", modelId: "opus", runtimeId: "claude" },
    { sources: [], assets: [], components: [] },
    []
  )
  assert.equal(message.modelId, "opus")
  assert.equal(message.runtimeId, "claude")
})

test("重新打开后：库里 output-error + 拒绝码仍是未执行，不是转圈", () => {
  const content = JSON.stringify({
    v: 1,
    content: "",
    tools: [
      {
        id: "tool_denied",
        name: "desktop_act",
        state: "output-error",
        result: { code: APPROVAL_REPLAY_DENIED },
        errorText: APPROVAL_REPLAY_DENIED_COPY
      }
    ]
  })
  const [message] = threadFromRows([
    { id: "msg_denied", role: "assistant", content, createdAt: 1 }
  ])
  const tool = message?.tools?.[0]
  assert.ok(tool)
  assert.equal(tool.state, "output-error")
  assert.equal(isToolNotExecuted(tool), true)
  assert.equal(mapToolStatus(tool.state, tool), "denied")
  assert.notEqual(mapToolStatus(tool.state, tool), "running")
})

test("已结束会话回灌：approval-requested 中性封口，不转圈", () => {
  const content = JSON.stringify({
    v: 1,
    content: "",
    tools: [{ id: "tool_pending", name: "write_file", state: "approval-requested", args: { path: "a.ts" } }]
  })
  const [sealed] = threadFromRows([{ id: "msg_ended", role: "assistant", content, createdAt: 1 }])
  assert.equal(sealed?.tools?.[0]?.state, "output-error")
  assert.deepEqual(sealed?.tools?.[0]?.result, { decision: "cancelled" })
  assert.equal(mapToolStatus(sealed!.tools![0]!.state, sealed!.tools![0]), "skipped")
  const [live] = threadFromRows(
    [{ id: "msg_ended", role: "assistant" as const, content, createdAt: 1 }],
    { sealAbandoned: false }
  )
  assert.equal(live?.tools?.[0]?.state, "approval-requested")
})

test("仍在跑的会话回灌：不把 input-available 封成出错", () => {
  const content = JSON.stringify({
    v: 1,
    content: "",
    tools: [{ id: "tool_live", name: "write_file", state: "input-available", args: { path: "a.ts" } }]
  })
  const row = { id: "msg_live", role: "assistant" as const, content, createdAt: 1 }
  const [sealed] = threadFromRows([row])
  assert.equal(sealed?.tools?.[0]?.state, "output-error")
  const [live] = threadFromRows([row], { sealAbandoned: false })
  assert.equal(live?.tools?.[0]?.state, "input-available")
})

test("hydrate 恢复本轮 runId，旧泡不跟新一轮", () => {
  const message = mapAssistantThreadMessage(
    { id: "msg_run", content: "ok", createdAt: 1 },
    { v: 1, content: "ok", runId: "run_2" },
    { sources: [], assets: [], components: [] },
    []
  )
  assert.equal(message.runId, "run_2")
})

test("无 stamp 的旧信封 runKind 为空", () => {
  const message = mapAssistantThreadMessage(
    { id: "msg_2", content: "ok", createdAt: 1 },
    { v: 1, content: "ok" },
    { sources: [], assets: [], components: [] },
    []
  )
  assert.equal(message.runKind, undefined)
  assert.equal(message.content, "ok")
})
