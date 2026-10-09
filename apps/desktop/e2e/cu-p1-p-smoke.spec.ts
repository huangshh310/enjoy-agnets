/**
 * CU-P1-P / P1-36 窗口冒烟：普通会话卡、敏感卡、硬拒人话、空态 @{app} pill。
 * 只走 ENJOY_E2E_STUB，不连真实 Provider / helper。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { existsSync, mkdirSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("CU 铬：pill / 本会话默认 / 敏感警示 / 硬拒中文卡", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-cu-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-cu-ud-"))
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
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })

    const pill = window.locator('[data-testid="empty-state-desktop-pill"]')
    await pill.waitFor({ timeout: 15_000 })
    await expect(pill).toContainText("@日历")
    await snap(window, "cu-empty-pill")

    await sendComposer(window, composer, "desktop calendar click")
    await window.locator('[data-testid="desktop-approval-card"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="approval-session"]')).toHaveAttribute("aria-checked", "true")
    await expect(window.locator('[data-testid="desktop-approval-sensitive"]')).toHaveCount(0)
    await snap(window, "cu-approval-session")
    await dismissDesktopApproval(window)

    await sendComposer(window, composer, "desktop terminal click")
    await window.locator('[data-testid="desktop-approval-sensitive"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="desktop-approval-sensitive"]')).toContainText("这是敏感应用，每次都会问你")
    await expect(window.locator('[data-testid="approval-allow"]')).toHaveAttribute("aria-checked", "true")
    await expect(window.locator('[data-testid="approval-session"]')).toHaveCount(0)
    await snap(window, "cu-approval-sensitive")
    await dismissDesktopApproval(window)

    await sendComposer(window, composer, "desktop coords deny")
    const failed = window.locator('[data-testid="desktop-act-failed"]')
    await failed.waitFor({ timeout: 15_000 })
    await expect(failed).toContainText("屏幕坐标默认关闭")
    await expect(failed).toContainText("高级坐标")
    await expect(failed).not.toContainText("bare_coords_disabled")
    await expect(failed).not.toContainText("裸坐标")
    await snap(window, "cu-hard-refuse")

    await window.evaluate(() => {
      location.hash = "#/settings/computer-use"
    })
    await window.locator('[data-testid="advanced-coords-row"]').waitFor({ timeout: 12_000 })
    await expect(window.locator('[data-testid="advanced-coords-row"]')).toContainText("一般用不到")
    await snap(window, "cu-advanced-coords")
  } finally {
    await app.close()
  }
})

async function dismissDesktopApproval(window: Page) {
  await window.locator('[data-testid="approval-deny"]').click()
  await window.locator('[data-testid="approval-continue"]').click()
  await window.locator('[data-testid="desktop-approval-card"]').waitFor({ state: "detached", timeout: 12_000 })
}

async function snap(window: Page, name: string) {
  await window.screenshot({ path: join(shots, `${name}.png`), fullPage: true })
}
