import assert from "node:assert/strict"
import { test } from "node:test"
import { planAdoptedDefaultRoute } from "../../../main/services/default-chat-route.ts"
import { applyPreferredRuntime, persistPreferredAfterSecret } from "./persist-preferred-runtime.ts"

test("asDefault 写 preferredRuntimeId，即使已经是这台引擎", () => {
  const store = { preferredRuntimeId: "enjoy-local", setPreferredRuntimeId(id: string) {
    this.preferredRuntimeId = id
  } }
  applyPreferredRuntime(store, "claude")
  assert.equal(store.preferredRuntimeId, "claude")
  applyPreferredRuntime(store, "claude")
  assert.equal(store.preferredRuntimeId, "claude")
})

test("设主引擎密钥失败不盖偏好，随后仍可 auto-adopt", async () => {
  let preferred = "enjoy-local"
  let prefsWritten = false
  await assert.rejects(
    () =>
      persistPreferredAfterSecret({
        writeSecret: async () => {
          throw new Error("KEYCHAIN_UNAVAILABLE")
        },
        applyPreferred: () => {
          preferred = "claude"
        },
        writePreferences: async () => {
          prefsWritten = true
        }
      }),
    /KEYCHAIN_UNAVAILABLE/
  )
  assert.equal(preferred, "enjoy-local")
  assert.equal(prefsWritten, false)
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      routeRuntimeId: "claude",
      hadNoUsableRoute: true,
      explicit: false
    }),
    "adopt"
  )
})

test("密钥写成功后才改偏好", async () => {
  const order: string[] = []
  await persistPreferredAfterSecret({
    writeSecret: async () => {
      order.push("secret")
    },
    applyPreferred: () => {
      order.push("apply")
    },
    writePreferences: async () => {
      order.push("prefs")
    }
  })
  assert.deepEqual(order, ["secret", "apply", "prefs"])
})
