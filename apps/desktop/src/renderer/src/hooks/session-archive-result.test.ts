import assert from "node:assert/strict"
import { test } from "node:test"
import { readDeniedApprovals } from "./session-archive-result.ts"

test("archive 返回值有无 deniedApprovals 都能读", () => {
  assert.equal(readDeniedApprovals(undefined), 0)
  assert.equal(readDeniedApprovals(null), 0)
  assert.equal(readDeniedApprovals({}), 0)
  assert.equal(readDeniedApprovals({ ok: true }), 0)
  assert.equal(readDeniedApprovals({ deniedApprovals: 0 }), 0)
  assert.equal(readDeniedApprovals({ deniedApprovals: 2 }), 2)
  assert.equal(readDeniedApprovals({ deniedApprovals: "2" }), 0)
})
