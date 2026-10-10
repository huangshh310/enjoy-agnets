import assert from "node:assert/strict"
import { test } from "node:test"
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { providerCredentialCheck } from "./provider-credential-check.ts"

const readiness = {
  defaultRoute: { runtimeId: "enjoy-local", profileId: "e2e" },
  credentialCheck: { state: "unverified", code: "network" }
} as ChatReadiness

test("有落盘就用落盘，不被快照盖住", () => {
  assert.deepEqual(
    providerCredentialCheck("prv_1", { state: "ok" }, readiness, { defaultId: "prv_1" }),
    { state: "ok" }
  )
})

test("缺落盘且是默认档案：先记忆后快照", () => {
  assert.deepEqual(providerCredentialCheck("prv_1", undefined, readiness, { defaultId: "prv_1" }), {
    state: "unverified",
    code: "network"
  })
  assert.deepEqual(
    providerCredentialCheck("prv_1", undefined, readiness, {
      defaultId: "prv_1",
      remembered: { state: "invalid", code: "auth_rejected" }
    }),
    { state: "invalid", code: "auth_rejected" }
  )
})

test("不是默认档案不借快照", () => {
  assert.equal(providerCredentialCheck("prv_other", undefined, readiness, { defaultId: "prv_1" }), undefined)
})
