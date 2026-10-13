import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { e2ePrepareFailForced, throwIfE2ePrepareFail } from "./e2e-prepare-fail.ts"

test("ENJOY_E2E_PREPARE_FAIL：只在 stub 闸开时生效", () => {
  assert.equal(e2ePrepareFailForced({ ENJOY_E2E_PREPARE_FAIL: "1" }, () => true), true)
  assert.equal(e2ePrepareFailForced({ ENJOY_E2E_PREPARE_FAIL: "1" }, () => false), false)
  assert.equal(e2ePrepareFailForced({}, () => true), false)
  assert.throws(() => throwIfE2ePrepareFail({ ENJOY_E2E_PREPARE_FAIL: "1" }, () => true), /vision-capable/)
  assert.doesNotThrow(() => throwIfE2ePrepareFail({ ENJOY_E2E_PREPARE_FAIL: "1" }, () => false))
})

test("prepareAndPump 在 try 内调用开关", () => {
  const src = readFileSync(new URL("./agent-run-prepare.ts", import.meta.url), "utf8")
  assert.match(src, /try \{\s*throwIfE2ePrepareFail\(\)/)
})
