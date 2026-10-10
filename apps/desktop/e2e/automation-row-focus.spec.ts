/**
 * 自动化整行点开抽屉；鼠标打开后 Esc 回焦不留橙环。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("点行名打开抽屉，Esc 后鼠标回焦无环", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-auto-row-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-auto-row-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
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
    await window
      .waitForSelector('button:has-text("跳过设置"), [data-testid="composer-input"]', { timeout: 20_000 })
      .catch(() => undefined)
    const skipGuide = window.getByRole("button", { name: "跳过设置" })
    if ((await skipGuide.count()) > 0) await skipGuide.click()
    await window.evaluate(() => {
      location.hash = "#/automations"
    })
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    const noon = window.locator('[data-testid="automation-row"]').filter({ hasText: "午间改动复盘" })
    await expect(noon).toBeVisible({ timeout: 12_000 })
    await noon.getByText("午间改动复盘").click()
    await expect(window.locator("#automation-editor-title")).toBeVisible({ timeout: 12_000 })
    await window.screenshot({ path: join(shots, "p2_automation_row_click.png"), fullPage: true })
    await window.keyboard.press("Escape")
    await expect(window.locator("#automation-editor-title")).toHaveCount(0, { timeout: 8_000 })
    const openBtn = noon.locator('[data-testid="automation-row-open"]')
    await expect(openBtn).toHaveAttribute("data-pointer-return", "")
    const ring = await openBtn.evaluate((node) => {
      const style = getComputedStyle(node)
      return { shadow: style.boxShadow, outline: style.outlineStyle }
    })
    expect(ring.shadow === "none" || ring.shadow === "").toBeTruthy()
    expect(ring.outline === "none" || ring.outline === "").toBeTruthy()
    await window.screenshot({ path: join(shots, "p2_automation_esc_no_ring.png"), fullPage: true })
  } finally {
    const proc = app.process()
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 1_500))]).catch(() => undefined)
    try {
      proc?.kill("SIGKILL")
    } catch {
      /* already gone */
    }
  }
})
