import assert from "node:assert/strict"
import { test } from "node:test"
import { cliRegionOf, DOMESTIC_CLI_IDS, INTERNATIONAL_CLI_IDS } from "./cli-region.ts"

test("国外 / 国产互斥，Enjoy 本地与自定义无地域", () => {
  assert.equal(cliRegionOf("droid"), "international")
  assert.equal(cliRegionOf("devin"), "international")
  assert.equal(cliRegionOf("claude"), "international")
  assert.equal(cliRegionOf("qwen"), "domestic")
  assert.equal(cliRegionOf("deepseek"), "domestic")
  assert.equal(cliRegionOf("enjoy-local"), null)
  assert.equal(cliRegionOf("custom:lab"), null)
  assert.equal(cliRegionOf(undefined), null)
  const overlap = INTERNATIONAL_CLI_IDS.filter((id) => (DOMESTIC_CLI_IDS as readonly string[]).includes(id))
  assert.deepEqual(overlap, [])
})
