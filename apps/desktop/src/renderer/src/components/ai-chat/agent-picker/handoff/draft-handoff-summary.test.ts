import assert from "node:assert/strict"
import { test } from "node:test"
import { draftHandoffParts, draftHandoffSummary } from "./draft-handoff-summary.ts"

test("摘要含最近目标、文件与未决审批", () => {
  const text = draftHandoffSummary({
    messages: [
      { role: "user", content: "修登录校验" },
      {
        role: "assistant",
        content: "改了",
        tools: [{ name: "edit_file", args: { path: "src/auth.ts" } }]
      }
    ],
    pendingApprovalName: "bash",
    filePaths: ["src/login.tsx"]
  })
  assert.ok(text.includes("修登录校验"))
  assert.ok(text.includes("auth.ts"))
  assert.ok(text.includes("login.tsx"))
  assert.ok(text.includes("bash"))
  const parts = draftHandoffParts({
    messages: [
      { role: "user", content: "修登录校验" },
      {
        role: "assistant",
        content: "改了",
        tools: [{ name: "edit_file", args: { path: "src/auth.ts" } }]
      }
    ],
    pendingApprovalName: "bash",
    filePaths: ["src/login.tsx"]
  })
  assert.deepEqual(parts.files, ["login.tsx", "auth.ts"])
  assert.ok(!parts.summary.includes("auth.ts"))
})

test("空线程给一句中性说明，不伪装成用户首条", () => {
  const text = draftHandoffSummary({ messages: [] })
  assert.ok(text.includes("上一引擎"))
  assert.ok(!text.startsWith("请继续"))
})
