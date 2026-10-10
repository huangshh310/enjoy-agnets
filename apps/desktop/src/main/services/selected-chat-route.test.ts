/**
 * 发送闸只拦本轮选中的 enjoy-local；不确定路线与后台入口放行。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { NO_CHAT_ROUTE } from "@enjoy-agents/ipc-contract/chat-readiness"
import { selectedRouteGateCode, shouldSkipSelectedRouteGate } from "./selected-chat-route.ts"

test("自定义 ACP / 未 inspect 的 CLI / Harness 不挡", () => {
  assert.equal(
    selectedRouteGateCode({
      skip: false,
      runtimeId: "custom:qwen",
      codingRuntime: "local",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    null
  )
  assert.equal(
    selectedRouteGateCode({
      skip: false,
      runtimeId: "claude",
      codingRuntime: "local",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    null
  )
  assert.equal(
    selectedRouteGateCode({
      skip: false,
      runtimeId: "enjoy-local",
      codingRuntime: "harness",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    null
  )
})

test("enjoy-local 没模型且没密钥才回 no_chat_route", () => {
  assert.equal(
    selectedRouteGateCode({
      skip: false,
      runtimeId: "enjoy-local",
      codingRuntime: "local",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    NO_CHAT_ROUTE
  )
  assert.equal(
    selectedRouteGateCode({
      skip: false,
      runtimeId: "enjoy-local",
      codingRuntime: "local",
      hasEnjoySecret: true,
      verifiedLocal: false
    }),
    null
  )
  assert.equal(
    selectedRouteGateCode({
      skip: false,
      runtimeId: "enjoy-local",
      codingRuntime: "local",
      hasEnjoySecret: false,
      verifiedLocal: "unknown"
    }),
    null
  )
})

test("自动化 / 工作流 / 续跑不进闸", () => {
  assert.equal(shouldSkipSelectedRouteGate({ automationSource: { id: "auto" } }), true)
  assert.equal(shouldSkipSelectedRouteGate({ rememberMru: false }), true)
  assert.equal(shouldSkipSelectedRouteGate({ isResume: true }), true)
  assert.equal(shouldSkipSelectedRouteGate({ isHeartbeat: true }), true)
  assert.equal(shouldSkipSelectedRouteGate({}), false)
  assert.equal(
    selectedRouteGateCode({
      skip: true,
      runtimeId: "enjoy-local",
      codingRuntime: "local",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    null
  )
})
