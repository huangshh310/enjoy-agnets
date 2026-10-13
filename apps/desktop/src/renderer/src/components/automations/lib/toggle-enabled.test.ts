import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { toggleAutomationEnabled } from "./toggle-enabled.ts"

test("开关只发 { id, enabled }，不带说明（旧的空说明记录可暂停）", async () => {
  const calls: unknown[] = []
  const ok = await toggleAutomationEnabled({ setEnabled: async (input) => void calls.push(input) }, "auto_old", false, () => {
    throw new Error("should not error")
  })
  assert.equal(ok, true)
  assert.deepEqual(calls, [{ id: "auto_old", enabled: false }])
})

test("失败不吞：交给 onError", async () => {
  const errors: string[] = []
  const ok = await toggleAutomationEnabled(
    { setEnabled: async () => Promise.reject(new Error("Automation not found.")) },
    "x",
    true,
    (message) => errors.push(message)
  )
  assert.equal(ok, false)
  assert.deepEqual(errors, ["Automation not found."])
})

test("页面开关走 setEnabled 并出 toast，不再整条 upsert", () => {
  const page = readFileSync(new URL("../automations-page.tsx", import.meta.url), "utf8")
  const fn = page.slice(page.indexOf("async function toggleEnabled"), page.indexOf("async function runDraft"))
  assert.match(fn, /toggleAutomationEnabled\(/)
  assert.match(fn, /showAppToast\(/)
  assert.doesNotMatch(fn, /automations\.upsert/)
})
