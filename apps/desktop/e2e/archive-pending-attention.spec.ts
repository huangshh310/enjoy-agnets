/**
 * 带未决审批归档：不得变成「需处理 2」+ 两粒出错。
 */
import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("归档待审批会话：顶栏不留需处理 / 出错", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-arch-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-ud-arch-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  const app = await electron.launch({
    args: [mainEntry],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
    }
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="approval-allow"]').waitFor({ timeout: 15_000 })

    await window.locator('[data-testid="sidebar-session-row"]').first().hover()
    await window.locator('[data-testid="session-row-menu"]').first().click()
    await window.locator('[data-testid="session-row-menu-archive"]').click()
    await window.locator('[data-testid="session-archived-toast"]').waitFor({ timeout: 10_000 })

    await expect(window.locator('[data-testid="attention-strip"]')).toHaveCount(0)
    await expect(window.locator("body")).not.toContainText("需处理 2")
  } finally {
    await app.close()
  }
})
