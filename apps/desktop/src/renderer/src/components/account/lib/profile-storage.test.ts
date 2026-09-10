import assert from "node:assert/strict"
import { test } from "node:test"
import { fromAccountProfilePref, toAccountProfilePref } from "./profile-storage.ts"

test("资料往返 preferences 不丢封面和 Blobatar 种子", () => {
  const stored = {
    name: "Ada",
    handle: "@ada",
    email: "ada@local",
    roleTitle: "Engineer",
    coverPreset: "frost" as const,
    blobatarConfig: { name: "Ada", hue: 12, expression: "happy" as const }
  }
  const pref = toAccountProfilePref(stored)
  const back = fromAccountProfilePref(pref)
  assert.equal(back.name, "Ada")
  assert.equal(back.coverPreset, "frost")
  assert.equal(back.blobatarConfig.name, "Ada")
  assert.equal(back.blobatarConfig.hue, 12)
})
