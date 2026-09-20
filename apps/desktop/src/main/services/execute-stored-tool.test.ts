import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("审批续跑不得把 SSH root 回落成本机 host", () => {
  const src = readFileSync(new URL("./execute-stored-tool.ts", import.meta.url), "utf8")
  assert.match(src, /looksLikeSshRoot/)
  assert.match(src, /disconnectedError\("tool"\)/)
  assert.equal(src.includes("回落本机 host"), false)
})
