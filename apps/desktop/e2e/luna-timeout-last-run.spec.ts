/**
 * luna C 端：补跑超时示例抽屉折叠条上方必须能看见「上次：…」。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("补跑超时抽屉常驻上次行", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-timeout-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-timeout-ud-"))
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      TZ: "Asia/Shanghai",
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ENJOY_DEV_SEED_AUTO_P2: "1"
    }
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
      timeout: 20_000
    })
    await window.setViewportSize({ width: 1440, height: 900 })
    await window.evaluate(() => {
      location.hash = "#/automations"
    })
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    const row = window.locator('[data-testid="automation-row"]').filter({ hasText: "补跑超时示例" })
    await expect(row).toContainText("补跑等待确认超时", { timeout: 12_000 })
    await row.scrollIntoViewIfNeeded()
    await row.locator('[data-testid="automation-row-open"]').evaluate((node) => {
      if (node instanceof HTMLButtonElement) node.click()
    })
    await window.locator("#automation-editor-title").waitFor({ timeout: 12_000 })
    const lastRun = window.locator('[data-testid="automation-drawer-last-run"]')
    await expect(lastRun).toBeVisible({ timeout: 8_000 })
    await expect(lastRun).toContainText("上次：")
    await expect(lastRun).toContainText("补跑等待确认超时")
    await lastRun.scrollIntoViewIfNeeded()
    await window.screenshot({ path: join(shots, "luna_timeout_last_run.png"), fullPage: true })
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 8_000))])
  }
})
