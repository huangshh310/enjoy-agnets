import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
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

test("导轨标识不含远程引擎，runtimeId 枚举不加 ssh", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "composer-agents.ts"), "utf8")
  assert.equal(src.includes("远程引擎"), false)
  assert.equal(/\bssh\b/.test(src), false)
})
