import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isRestoreFamilyCode,
  RESTORE_INTERRUPTED_RUNNING,
  RESTORE_NO_MATCHING_CODE,
  RESTORE_RESTART_CANCELLED,
  restoreFamilyCodeOf
} from "./restore-codes.ts"

test("回挂家族认三枚机器码", () => {
  assert.equal(isRestoreFamilyCode(RESTORE_NO_MATCHING_CODE), true)
  assert.equal(isRestoreFamilyCode(RESTORE_RESTART_CANCELLED), true)
  assert.equal(isRestoreFamilyCode(RESTORE_INTERRUPTED_RUNNING), true)
  assert.equal(isRestoreFamilyCode("Request timed out"), false)
  assert.equal(isRestoreFamilyCode("run_failed"), false)
  assert.equal(restoreFamilyCodeOf({ message: "Request timed out" }), undefined)
  assert.equal(restoreFamilyCodeOf({ code: RESTORE_RESTART_CANCELLED }), RESTORE_RESTART_CANCELLED)
  assert.equal(restoreFamilyCodeOf({ code: RESTORE_INTERRUPTED_RUNNING }), RESTORE_INTERRUPTED_RUNNING)
})
