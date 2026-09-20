/**
 * I1 换模态：不支持禁用、未登录/空表诚实、历史标不跟当前 picker。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  formatHistoryModelLabel,
  modelSwitchKind,
  shortSessionId,
  supportsMidSessionModelSwitch
} from "./model-switch-state.ts"

test("models none 不支持中途换模型", () => {
  assert.equal(supportsMidSessionModelSwitch("none"), false)
  assert.equal(supportsMidSessionModelSwitch("catalog"), true)
  assert.equal(supportsMidSessionModelSwitch("inspect"), true)
  assert.equal(
    modelSwitchKind({ modelsCapability: "none", readiness: "ready", modelCount: 3 }),
    "unsupported"
  )
})

test("官方未登录优先于名单，禁止空成功", () => {
  assert.equal(
    modelSwitchKind({ modelsCapability: "inspect", readiness: "needs_login", modelCount: 3 }),
    "needs_login"
  )
  assert.equal(
    modelSwitchKind({ modelsCapability: "inspect", readiness: "inspecting", modelCount: 0 }),
    "needs_login"
  )
  assert.equal(
    modelSwitchKind({ modelsCapability: "catalog", readiness: "ready", modelCount: 0 }),
    "empty"
  )
  assert.equal(
    modelSwitchKind({ modelsCapability: "catalog", readiness: "ready", modelCount: 2 }),
    "ready"
  )
})

test("历史标只用本轮 stamp，不拼当前模型", () => {
  assert.equal(formatHistoryModelLabel({ engineLabel: "Claude", modelLabel: "Sonnet 4" }), "Claude · Sonnet 4")
  assert.equal(formatHistoryModelLabel({ engineLabel: "Claude", modelLabel: "" }), "Claude")
  assert.equal(formatHistoryModelLabel({}), null)
})

test("脚注会话 id 截短，不新开会话", () => {
  assert.equal(shortSessionId("s_8f2a"), "s_8f2a")
  assert.equal(shortSessionId("ses_abcdefghij"), "ses_abcd")
  assert.equal(shortSessionId(null), "")
})
