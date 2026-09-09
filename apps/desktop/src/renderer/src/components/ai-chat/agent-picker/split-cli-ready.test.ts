/**
 * 已装与未装分开，未装也要上轨。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { splitCliReady } from "./split-cli-ready.ts"

test("已装与未装分开，未装也要上轨", () => {
  const split = splitCliReady([
    { id: "claude", status: "ready" },
    { id: "cursor", status: "missing" },
    { id: "omp", status: "ready" }
  ])
  assert.deepEqual(
    split.installed.map((item) => item.id),
    ["claude", "omp"]
  )
  assert.deepEqual(
    split.missing.map((item) => item.id),
    ["cursor"]
  )
})
