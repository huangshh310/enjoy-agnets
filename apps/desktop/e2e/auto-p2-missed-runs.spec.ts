/**
 * AUTO-P2 窗口冒烟：跳过次行、错过 N 次、补跑记录、超时非红、Dock 补跑来源。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("AUTO-P2：错过次行 / 默认关 / 补跑抽屉 / 超时非红 / Dock 来源", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-auto-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-auto-ud-"))
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CU_READY: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
    }
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
      timeout: 20_000
    })

    await window.evaluate(() => {
      location.hash = "#/automations"
    })
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="automation-row-missed-many"]')).toContainText("错过 3 次")
    await expect(window.locator('[data-testid="automation-row-missed-many"]')).toContainText("电脑睡眠")
    await expect(window.locator('[data-testid="automation-row-skipped"]')).toContainText("已跳过 · 应用未运行")
    await expect(window.locator('[data-testid="automation-row-neutral"]')).toContainText("补跑等待确认超时，未运行")
    await expect(window.locator('[data-testid="automation-row-neutral"]')).not.toHaveClass(/error/)
    await snap(window, "auto-p2-list")

    await window.locator('[data-testid="page-automations"]').getByRole("button", { name: "新建" }).click()
    await window.locator('[data-testid="automation-catch-up-toggle"]').waitFor({ timeout: 8_000 })
    const createToggle = window.locator('[data-testid="automation-catch-up-toggle"] [role="switch"]')
    await expect(createToggle).toHaveAttribute("aria-checked", "false")
    await snap(window, "auto-p2-drawer-default-off")
    await window.locator('[aria-label="关闭"]').first().click()
    await window.locator('[data-testid="automation-catch-up-toggle"]').waitFor({ state: "detached", timeout: 8_000 })

    await window.locator('[data-testid="automation-row"]').filter({ hasText: "午间 diff 复盘" }).click()
    await window.locator('[data-testid="automation-catch-up-toggle"]').waitFor({ timeout: 8_000 })
    const toggle = window.locator('[data-testid="automation-catch-up-toggle"] [role="switch"]')
    await expect(toggle).toHaveAttribute("aria-checked", "true")
    await window.locator('[data-testid="automation-missed-expand"] summary').click()
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).toContainText("补跑")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).toContainText("计划")
    await snap(window, "auto-p2-drawer-catchup")
    await window.locator('[aria-label="关闭"]').first().click()
    await window.locator('[data-testid="automation-catch-up-toggle"]').waitFor({ state: "detached", timeout: 8_000 })

    await window.locator('[data-testid="automation-row"]').filter({ hasText: "补跑超时示例" }).click()
    await window.locator('[data-testid="automation-missed-expand"] summary').click()
    await expect(window.locator('[data-testid="automation-record-neutral"]')).toContainText("补跑等待确认超时，未运行")
    await snap(window, "auto-p2-drawer-timeout")

    await window.evaluate(() => {
      location.hash = "#/"
    })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "desktop catchup notes")
    await window.locator('[data-testid="desktop-approval-card"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="approval-automation-source"]')).toContainText(
      "来自自动化「晨间待办整理」的补跑"
    )
    await snap(window, "auto-p2-dock-catchup")
    await window.locator('[data-testid="approval-deny"]').click()
    await window.locator('[data-testid="approval-continue"]').click()
    await window.locator('[data-testid="desktop-approval-card"]').waitFor({ state: "detached", timeout: 12_000 })
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 8_000))])
  }
})

async function snap(window: Page, name: string) {
  await window.screenshot({ path: join(shots, `${name}.png`), fullPage: true })
}
