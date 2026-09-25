import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("主循环 Allow 后 needs_second_confirm 必须再停卡，不能只丢 tool.result", () => {
  const src = readFileSync(new URL("./agent-runner.ts", import.meta.url), "utf8")
  assert.match(src, /maybeReparkSecondConfirm/)
  assert.match(src, /reparkDesktopSecondConfirm/)
  assert.match(src, /isDesktopSecondConfirmResult/)
  assert.match(src, /isSecondConfirmPending/)
})

test("活泵二次确认 waiter 挂在 pump，确认后才对新观察 act", () => {
  const pump = readFileSync(new URL("./agent-pump.ts", import.meta.url), "utf8")
  const waiter = readFileSync(new URL("./bind-desktop-second-confirm-waiter.ts", import.meta.url), "utf8")
  assert.match(pump, /bindSecondConfirmWaiter/)
  assert.match(pump, /unbindSecondConfirmWaiter/)
  assert.match(waiter, /bindDesktopSecondConfirmWait/)
  const tools = readFileSync(
    new URL("./builtin-tools/computer-use/desktop-tools.ts", import.meta.url),
    "utf8"
  )
  assert.match(tools, /finishDesktopAct/)
  assert.match(tools, /confirmActArgs/)
})
