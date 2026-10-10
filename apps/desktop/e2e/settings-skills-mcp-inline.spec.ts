/**
 * 设置里的技能 / MCP 停在设置壳；遥测页不得摊出 pages. 裸键。
 */
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { hideOverlays, launchEnjoy, snap } from "./base-p0-1-launch"

test("设置技能与 MCP 内联，返回仍落在原分段", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-set-hub-"))
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
    await openSettingsSection(window, "skills")
    await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/settings/skills")
    await expect(window.locator('[data-testid="module-nav-scroll"]')).toBeVisible()
    await expect(window.getByRole("button", { name: "通用" })).toBeVisible()
    await expect(window.getByTestId("settings-open-hub")).toContainText("打开技能中心")
    await snap(window, "settings-skills-inline")
    await window.getByTestId("settings-open-hub").click()
    await expect.poll(() => window.evaluate(() => location.hash)).toMatch(/#\/skills/)
    await expect(window.getByTestId("return-to-settings")).toBeVisible()
    await snap(window, "skills-center-from-settings")
    await window.getByTestId("return-to-settings").click()
    await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/settings/skills")
    await expect(window.getByRole("button", { name: "通用" })).toBeVisible()

    await openSettingsSection(window, "mcp")
    await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/settings/mcp")
    await expect(window.getByRole("button", { name: "通用" })).toBeVisible()
    await expect(window.getByTestId("settings-open-hub")).toContainText("打开 MCP 中心")
    await snap(window, "settings-mcp-inline")
    await window.getByTestId("settings-open-hub").click()
    await expect.poll(() => window.evaluate(() => location.hash)).toMatch(/#\/mcp/)
    await expect(window.getByTestId("return-to-settings")).toBeVisible()
    await window.getByTestId("return-to-settings").click()
    await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/settings/mcp")

    await window.evaluate(() => {
      location.hash = "#/settings/telemetry"
    })
    await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/settings/telemetry")
    await expect(window.getByText("pages.observability.allHealthy")).toHaveCount(0)
    await expect(window.getByText(/^pages\./)).toHaveCount(0)
    await expect(window.getByText(/^chat\./)).toHaveCount(0)
    await snap(window, "settings-telemetry-copy")
  } finally {
    await app.close()
  }
})

async function openSettingsSection(window: Page, section: "skills" | "mcp"): Promise<void> {
  await window.evaluate((next) => {
    location.hash = `#/settings/${next}`
  }, section)
}
