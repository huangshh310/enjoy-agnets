/**
 * 缺 args：能回填就带真参；回填不了就 fail closed，desktop_act 绝不用 {}。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  APPROVAL_ARGS_MISSING,
  isMissingApprovalArgs,
  resolveApprovalArgs
} from "./resolve-approval-args.ts"

test("已有 tool.start 入参：缺 args 的卡回填真 path", () => {
  const resolved = resolveApprovalArgs({
    name: "write_file",
    args: undefined,
    toolCallId: "tool_1",
    tools: [{ id: "tool_1", name: "write_file", state: "input-available", args: { path: "e2e-stub.txt" } }]
  })
  assert.deepEqual(resolved, { ok: true, args: { path: "e2e-stub.txt" } })
})

test("回填不了：不弹允许卡，返回 approval_args_missing", () => {
  const resolved = resolveApprovalArgs({
    name: "write_file",
    args: {},
    toolCallId: "tool_missing",
    tools: []
  })
  assert.equal(resolved.ok, false)
  if (resolved.ok) return
  assert.equal(resolved.code, APPROVAL_ARGS_MISSING)
  assert.match(resolved.message, /没拿到这次操作的参数/)
})

test("desktop_act 空对象也算缺参，禁止拿 {} 判敏感", () => {
  assert.equal(isMissingApprovalArgs({}), true)
  const resolved = resolveApprovalArgs({
    name: "desktop_act",
    args: {},
    toolCallId: "tool_desk",
    tools: [{ id: "tool_desk", name: "desktop_act", state: "input-available" }]
  })
  assert.equal(resolved.ok, false)
})
