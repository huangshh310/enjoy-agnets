import assert from "node:assert/strict"
import { test } from "node:test"
import {
  availableAfterPromotion,
  canPromoteComingSoon,
  comingSoonHardGates,
  M4_PROMOTION_ORDER
} from "./coming-soon-promotion.ts"

test("M4 升级顺序锁定为 OpenCode → Gemini → Pi", () => {
  assert.deepEqual([...M4_PROMOTION_ORDER], ["opencode", "gemini", "pi"])
})

test("OpenCode / Gemini / Pi 静态硬接线全过才能 available", () => {
  for (const id of M4_PROMOTION_ORDER) {
    const gates = comingSoonHardGates(id)
    assert.equal(gates.hasCatalog, true, id)
    assert.equal(gates.hasCapabilities, true, id)
    assert.equal(gates.acpHostWired, true, id)
    assert.equal(gates.approvalWired, true, id)
    assert.equal(canPromoteComingSoon(id), true, id)
    assert.equal(availableAfterPromotion(id, true), true, id)
  }
})

test("没有 catalog / 能力的 id 不能假升", () => {
  assert.equal(canPromoteComingSoon("not-a-cli"), false)
  assert.equal(availableAfterPromotion("not-a-cli", true), true)
  assert.deepEqual(comingSoonHardGates("not-a-cli"), {
    hasCatalog: false,
    hasCapabilities: false,
    acpHostWired: false,
    approvalWired: false
  })
})
