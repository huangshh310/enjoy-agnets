import assert from "node:assert/strict"
import { test } from "node:test"
import { isLegacyHandoffTurn } from "./handoff-legacy.ts"

test("无交接切点时气泡都不算旧", () => {
  assert.equal(isLegacyHandoffTurn(1, undefined), false)
})

test("交接切点之前含当时的气泡算旧", () => {
  assert.equal(isLegacyHandoffTurn(10, 20), true)
  assert.equal(isLegacyHandoffTurn(20, 20), true)
  assert.equal(isLegacyHandoffTurn(21, 20), false)
})
