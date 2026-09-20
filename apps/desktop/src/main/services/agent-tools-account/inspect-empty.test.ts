/**
 * Hermes / 自定义等无账号探针：回未登录，不是检测中，也不假已登录。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { emptyInspectResult, hasOfficialAccountProbe } from "./inspect-empty.ts"

test("无探针 CLI 回未登录，authAccount 必须有 loggedIn=false", () => {
  for (const id of ["hermes", "amp", "custom:my-acp"] as const) {
    const result = emptyInspectResult(id)
    assert.equal(result.authAccount?.loggedIn, false, `${id} must not stay detecting`)
    assert.equal(result.authAccount?.probed, false, `${id} must mark no login probe`)
    assert.notEqual(result.authAccount, undefined)
  }
  assert.equal(hasOfficialAccountProbe("qwen"), false)
  assert.equal(hasOfficialAccountProbe("claude"), true)
})
