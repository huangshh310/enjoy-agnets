/**
 * restoreRunningRuns / 主进程启动接线：源码扫描，避免静态 import harness。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

test("restoreRunningRuns 续上挂 settle，没续上才 interrupted", () => {
  const src = readFileSync(join(dir, "restore-running-runs.ts"), "utf8")
  assert.match(src, /attachRestoredCatchUp/)
  assert.match(src, /stampUnrestoredCatchUp/)
  assert.match(src, /cancelRestoredRun/)
  const attach = readFileSync(join(dir, "restore-catchup.ts"), "utf8")
  assert.match(attach, /watchCatchUpSettle/)
  assert.match(attach, /failCatchUpWaiting/)
  assert.match(attach, /stampInterruptedAutomation/)
  const watch = readFileSync(join(dir, "watch-catchup-settle.ts"), "utf8")
  assert.match(watch, /waitForRunSettle/)
  assert.match(watch, /finishAutomationRun/)
})

test("拿不到单实例锁时不启动调度", () => {
  const index = readFileSync(join(dir, "../index.ts"), "utf8")
  assert.match(index, /acquireSingleInstanceLock/)
  assert.match(index, /bootPrimaryInstance/)
  assert.match(index, /startAutomationScheduler/)
  assert.match(index, /focusOrCreateMainWindow/)
  assert.match(index, /markQuitAllowed/)
  const loseStart = index.indexOf("if (!acquireSingleInstanceLock")
  const bootFn = index.indexOf("function bootPrimaryInstance")
  assert.ok(loseStart >= 0 && bootFn > loseStart)
  const lose = index.slice(loseStart, index.indexOf("function resolveAppIconPath"))
  assert.match(lose, /app\.quit\(\)/)
  assert.match(lose, /bootPrimaryInstance/)
  assert.doesNotMatch(lose, /startAutomationScheduler/)
  const boot = index.slice(bootFn)
  assert.match(boot, /startAutomationScheduler/)
})
