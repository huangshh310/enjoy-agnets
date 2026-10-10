/**
 * 缺 Key 必须是可识别的机器错，开跑折成 ok:false。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { NO_CHAT_ROUTE } from "@enjoy-agents/ipc-contract/chat-readiness"
import { foldMissingRunSecret, isMissingRunSecretError, MISSING_RUN_SECRET } from "./missing-run-secret.ts"
import { selectedRouteGateCode } from "./selected-chat-route.ts"

test("缺 Key 是可识别的机器错", () => {
  assert.equal(MISSING_RUN_SECRET.includes("Add an API key in Settings"), true)
  assert.equal(isMissingRunSecretError(new Error(MISSING_RUN_SECRET)), true)
  assert.equal(isMissingRunSecretError(new Error("other")), false)
  assert.equal(isMissingRunSecretError("nope"), false)
})

test("缺 Key 开跑折成 ok:false 而不是 throw", () => {
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
  assert.deepEqual(foldMissingRunSecret(new Error(MISSING_RUN_SECRET)), {
    ok: false,
    code: NO_CHAT_ROUTE
  })
  assert.equal(foldMissingRunSecret(new Error("Harness is not ready")), null)
  assert.equal(NO_CHAT_ROUTE, "no_chat_route")
})
