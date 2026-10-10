/**
 * 重启回挂缺 args：能从 requestArgs 回填；两边都空不弹卡。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { parseStoredApprovalArgs } from "./restore-approval-args.ts"

test("库行 args 空时用 requestArgs 回填", () => {
  assert.deepEqual(
    parseStoredApprovalArgs({
      args: "{}",
      requestArgs: JSON.stringify({ path: "e2e-stub.txt" })
    }),
    { path: "e2e-stub.txt" }
  )
})

test("零参 {} 是合法入参，重启仍弹卡", () => {
  assert.deepEqual(parseStoredApprovalArgs({ args: "{}", requestArgs: "{}" }), {})
  assert.deepEqual(parseStoredApprovalArgs({ args: "{}" }), {})
})

test("args 与 requestArgs 都缺：不弹允许卡", () => {
  assert.equal(parseStoredApprovalArgs({}), null)
  assert.equal(parseStoredApprovalArgs({ args: null, requestArgs: null }), null)
})
