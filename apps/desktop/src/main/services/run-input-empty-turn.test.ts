/**
 * #155 leo soft：agent.run 入参最后一条用户句正文和附件不能同时为空；只图（空正文 + 附件）合法。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { RunAgentInput } from "@enjoy-agents/ipc-contract"

const base = { sessionId: "s", workspaceId: "w", modelId: "m" }

test("只图：空正文 + 附件 → 通过", () => {
  assert.equal(RunAgentInput.safeParse({ ...base, messages: [{ role: "user", content: "" }], attachments: ["ast_1"] }).success, true)
})

test("正文与附件都空 → 拒绝", () => {
  assert.equal(RunAgentInput.safeParse({ ...base, messages: [{ role: "user", content: "  " }], attachments: [] }).success, false)
})

test("有字无图 → 通过", () => {
  assert.equal(RunAgentInput.safeParse({ ...base, messages: [{ role: "user", content: "hi" }] }).success, true)
})
