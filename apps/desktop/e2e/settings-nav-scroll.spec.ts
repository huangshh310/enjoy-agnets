/**
 * 1100×700 设置侧栏：每一组都能滚到，含「项目与扩展」。
 */
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("1100×700 设置侧栏能滚到项目与扩展", async () => {
  test.setTimeout(90_000)
  const window = await launchSettingsWindow()
  if (!window) return
  const { page, app } = window
  try {
    await page.setViewportSize({ width: 1100, height: 700 })
    await page.evaluate(() => {
      location.hash = "#/settings/general"
    })
    await page.getByRole("heading", { name: "通用" }).waitFor({ timeout: 20_000 })
    const scroll = page.locator('[data-testid="module-nav-scroll"]')
    await expect(scroll).toBeVisible()
    const workspace = page.locator('[data-nav-group="workspace"]')
    await workspace.scrollIntoViewIfNeeded()
    await expect(workspace).toBeVisible()
    await expect(workspace).toContainText("项目与扩展")
    const org = page.locator('[data-nav-group="org"]')
    await org.scrollIntoViewIfNeeded()
    await expect(org).toBeVisible()
    await expect(page.getByRole("button", { name: "个人资料" })).toBeVisible()
    await page.screenshot({ path: join(shots, "batch3-settings-nav-1100.png") })
  } finally {
    await app.close()
  }
})

async function launchSettingsWindow(): Promise<{ page: Page; app: { close: () => Promise<void> } } | null> {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return null
  }
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-nav-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-nav-ud-"))
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
    }
  })
  const page = await app.firstWindow()
  await page.waitForSelector("#root", { timeout: 20_000 })
  await page.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
    timeout: 20_000
  })
  return { page, app }
}
