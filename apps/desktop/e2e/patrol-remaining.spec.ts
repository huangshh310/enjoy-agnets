/**
 * 巡检剩余截图：软件 GL 侧栏浅底、快捷键分名、审批查看差异。
 */
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { hideOverlays, launchEnjoy, snap } from "./base-p0-1-launch"
import { sendComposer } from "./send-composer"

test("软件 GL 侧栏浅底、快捷键分名、审批差异可滚", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-patrol-rest-"))
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    await window.evaluate(() => {
      document.documentElement.setAttribute("data-gpu-compositing", "off")
      document.documentElement.setAttribute("data-skin", "glass")
    })
    const colors = await window.evaluate(() => {
      const aside = document.querySelector("aside.rounded-3xl")
      const main = document.querySelector("main")
      return {
        aside: aside ? getComputedStyle(aside).backgroundColor : "",
        main: main ? getComputedStyle(main).backgroundColor : ""
      }
    })
    expect(colors.aside).toBe("rgb(250, 250, 250)")
    expect(colors.main).toBe("rgb(255, 255, 255)")
    await snap(window, "software-gl-sidebar-tint")

    await window.evaluate(() => {
      location.hash = "#/settings/shortcuts"
    })
    await window.getByText("快速搜索", { exact: true }).first().waitFor({ timeout: 15_000 })
    await expect(window.getByText("命令面板", { exact: true }).first()).toBeVisible()
    await snap(window, "shortcuts-quick-search-vs-palette")

    await window.evaluate(() => {
      location.hash = "#/"
    })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "please write a note")
    const viewDiff = window.getByText("查看差异")
    await expect(viewDiff).toBeVisible({ timeout: 15_000 })
    await viewDiff.click()
    await expect(window.getByTestId("approval-diff")).toBeVisible()
    await snap(window, "approval-view-diff")
    const deny = window.getByRole("button", { name: "拒绝" })
    if ((await deny.count()) > 0) await deny.click()
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 5_000))])
  }
})
