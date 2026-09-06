import assert from "node:assert/strict"
import { test } from "node:test"
import { SESSION_CAT } from "./session-mascots.ts"

test("改动条宠物只有小猫", () => {
  assert.equal(SESSION_CAT.name, "cat")
  assert.ok(SESSION_CAT.restPath.startsWith("M"))
  assert.ok(SESSION_CAT.talkPath.startsWith("M"))
  assert.notEqual(SESSION_CAT.restPath, SESSION_CAT.talkPath)
})
