import assert from "node:assert/strict"
import { test } from "node:test"
import { splitComposerRail } from "./split-composer-rail.ts"

test("导轨把 Enjoy Local 与 CLI 引擎拆开，DeepSeek / OMP 走 CLI 组", () => {
  const sections = splitComposerRail([
    { id: "enjoy-local" },
    { id: "claude" },
    { id: "deepseek" },
    { id: "omp" },
    { id: "pi", comingSoon: true }
  ])
  assert.deepEqual(
    sections.local.map((item) => item.id),
    ["enjoy-local"]
  )
  assert.deepEqual(
    sections.cli.map((item) => item.id),
    ["claude", "deepseek", "omp"]
  )
  assert.deepEqual(
    sections.soon.map((item) => item.id),
    ["pi"]
  )
  assert.ok(!sections.local.some((item) => item.id === "deepseek"))
})
