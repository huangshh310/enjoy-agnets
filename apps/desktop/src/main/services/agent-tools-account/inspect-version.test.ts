import assert from "node:assert/strict"
import { test } from "node:test"
import { pickInspectVersion } from "./inspect-version-pick.ts"

test("已有 cliVersion 优先生效，不造假版本", () => {
  assert.equal(
    pickInspectVersion({
      id: "cursor",
      authAccount: { loggedIn: true, cliVersion: "1.2.0" },
      models: []
    }),
    "1.2.0"
  )
  assert.equal(
    pickInspectVersion({
      id: "hermes",
      authAccount: { loggedIn: false },
      models: []
    }),
    null
  )
})
