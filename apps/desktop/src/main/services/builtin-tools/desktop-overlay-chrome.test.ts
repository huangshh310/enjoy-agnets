/**
 * Overlay HTML 守门：SoT testid、冷静铬，禁止霓虹 HUD / 空成功条。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../../resources/overlay/computer-use-overlay.html"),
  "utf8"
)

test("act begin 传入 runId；stop 先 cancel 再 abort 该 runId", () => {
  const tools = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "computer-use/desktop-tools.ts"),
    "utf8"
  )
  assert.match(tools, /resolveDesktopActRunId/)
  assert.match(tools, /currentToolRunId\(\)/)
  assert.match(tools, /currentPumpingRunId\(\)/)
  assert.match(tools, /runId:/)
  assert.match(tools, /cancelInFlightDesktopAct/)
  const chrome = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "desktop-overlay-chrome.ts"), "utf8")
  assert.match(chrome, /runDesktopOverlayStop/)
  assert.match(chrome, /cancelInFlightDesktopAct/)
  assert.match(chrome, /resolveDesktopActRunId/)
  assert.doesNotMatch(chrome, /执行器中途的 click 可能仍会落下/)
})

test("overlay 窗带 SoT testid，无红警 / 霓虹 / 空成功条", () => {
  assert.match(html, /data-testid="cu-overlay-frame"/)
  assert.match(html, /data-testid="cu-overlay-stop"/)
  assert.match(html, /正在操控/)
  assert.match(html, /Esc 停一手势/)
  assert.doesNotMatch(html, /操控完成/)
  assert.doesNotMatch(html, /Computer Use/)
  assert.doesNotMatch(html, /radar-dot|#10b981|click-beacon|#ef4444|#dc2626|#b42318/)
})

test("右栏 Desktop 带 SoT testid，空态不写正在控制", () => {
  const rail = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../renderer/src/components/ai-chat/right-pane/views/desktop-view.tsx"
    ),
    "utf8"
  )
  assert.match(rail, /data-testid="desktop-rail-empty"/)
  assert.match(rail, /data-testid="desktop-rail-card"/)
  assert.match(rail, /data-testid="desktop-rail-thumb"/)
  assert.match(rail, /paneDesktopEmpty/)
  assert.doesNotMatch(rail, /正在控制/)
})
