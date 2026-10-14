/**
 * 抽屉开着时 Esc 只关抽屉，设置页还在。
 */
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("供应商抽屉 Esc 只关抽屉，设置还在", async () => {
  const window = await launchSettingsWindow()
  if (!window) return
  const { page, app } = window
  try {
    await page.evaluate(() => {
      location.hash = "#/settings/providers"
    })
    await page.getByRole("button", { name: "编辑" }).first().waitFor({ timeout: 15_000 })
    await page.getByRole("button", { name: "编辑" }).first().click()
    await page.locator('[data-settings-drawer="open"]').waitFor({ timeout: 8_000 })
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-settings-drawer="open"]')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => location.hash)).toBe("#/settings/providers")
    await expect(page.getByRole("heading", { name: "模型供应商" })).toBeVisible()
  } finally {
    await app.close()
  }
})

test("智能体配置抽屉 Esc 只关抽屉，设置还在", async () => {
  const window = await launchSettingsWindow()
  if (!window) return
  const { page, app } = window
  try {
    await page.evaluate(() => {
      location.hash = "#/settings/agent"
    })
    await page.getByRole("button", { name: "配置" }).first().waitFor({ timeout: 15_000 })
    await page.getByRole("button", { name: "配置" }).first().click()
    await page.locator('[data-settings-drawer="open"]').waitFor({ timeout: 8_000 })
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-settings-drawer="open"]')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => location.hash)).toBe("#/settings/agent")
    await expect(page.getByRole("heading", { name: /智能体/ })).toBeVisible()
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
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-esc-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-esc-ud-"))
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
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
