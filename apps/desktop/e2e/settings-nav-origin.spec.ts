/**
 * 设置侧栏只高亮当前分段；从扩展进技能中心后齿轮与「返回设置」都回扩展。
 */
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { hideOverlays, launchEnjoy, snap } from "./base-p0-1-launch"

test("设置侧栏逐项只高亮当前分段", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-set-nav-"))
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
    await window.evaluate(() => {
      location.hash = "#/settings/general"
    })
    await window.locator('[data-testid="module-nav-general"]').waitFor({ timeout: 15_000 })
    const tabs = window.locator('[data-testid="module-nav-scroll"] button[data-testid^="module-nav-"]')
    const count = await tabs.count()
    expect(count).toBeGreaterThan(8)
    for (let index = 0; index < count; index += 1) {
      const tab = tabs.nth(index)
      await tab.scrollIntoViewIfNeeded()
      const id = (await tab.getAttribute("data-testid"))?.replace("module-nav-", "")
      expect(id).toBeTruthy()
      await tab.click()
      await expect.poll(() => window.evaluate(() => location.hash)).toBe(`#/settings/${id}`)
      await expect(tab).toHaveAttribute("aria-current", "page")
      await expect(window.locator('[data-testid="module-nav-scroll"] button[aria-current="page"]')).toHaveCount(1)
      if (id === "telemetry") await snap(window, "settings-nav-telemetry-only")
      if (id === "mcp") await snap(window, "settings-nav-mcp-only")
    }
  } finally {
    await app.close()
  }
})

test("从扩展进技能中心，返回设置与齿轮都回扩展", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-set-origin-"))
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
    await openExtensions(window)
    await window.getByTestId("extensions-add-skills").click()
    await expect.poll(() => window.evaluate(() => location.hash)).toMatch(/#\/skills/)
    await expect(window.getByTestId("return-to-settings")).toBeVisible()
    await snap(window, "settings-origin-skills-from-extensions")
    await window.getByTestId("return-to-settings").click()
    await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/settings/extensions")
    await expect(window.getByTestId("module-nav-extensions")).toHaveAttribute("aria-current", "page")
    await snap(window, "settings-origin-return-extensions")

    await window.getByTestId("extensions-add-skills").click()
    await expect.poll(() => window.evaluate(() => location.hash)).toMatch(/#\/skills/)
    await window.getByTestId("rail-settings").click()
    await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/settings/extensions")
    await expect(window.getByTestId("module-nav-extensions")).toHaveAttribute("aria-current", "page")
    await snap(window, "settings-origin-gear-extensions")
  } finally {
    await app.close()
  }
})

async function openExtensions(window: Page): Promise<void> {
  await window.evaluate(() => {
    location.hash = "#/settings/extensions"
  })
  await window.getByTestId("page-extensions").waitFor({ timeout: 15_000 })
}
