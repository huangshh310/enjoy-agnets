/**
 * 归档非当前会话后点 toast「撤销」：行回到原下标，已归档名单为空。
 * 归档当前会话改选相邻项，不进设置，toast 保活，撤销后重选原会话。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import type { ElectronApplication } from "playwright"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"
const SEED = "Seed session 28"

test("归档非当前会话后撤销，行回到原位且已归档为空", async () => {
  const app = await launchStub()
  if (!app) return
  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 920 })
    await sessionRow(window, "Seed session 01").scrollIntoViewIfNeeded()
    await sessionRow(window, "Seed session 01").click()

    const target = sessionRow(window, SEED)
    await target.scrollIntoViewIfNeeded()
    const before = await sessionIndex(window, SEED)
    expect(before).toBeGreaterThanOrEqual(0)
    await window.screenshot({ path: join(shots, "archive-title-1440.png") })
    await window.setViewportSize({ width: 1100, height: 920 })
    await target.scrollIntoViewIfNeeded()
    await window.screenshot({ path: join(shots, "archive-title-1100.png") })
    await window.setViewportSize({ width: 1440, height: 920 })

    await archiveRow(window, target)
    await expect(sessionRow(window, SEED)).toHaveCount(0, { timeout: 8_000 })
    const toast = window.locator('[data-testid="session-archived-toast"]')
    await expect(toast).toBeVisible({ timeout: 8_000 })
    await window.screenshot({ path: join(shots, "archive-undo-toast.png") })
    await toast.locator("[data-action]").click()

    await expect(sessionRow(window, SEED)).toHaveCount(1, { timeout: 8_000 })
    await expect.poll(() => sessionIndex(window, SEED)).toBe(before)
    await window.screenshot({ path: join(shots, "archive-undo-restored.png") })

    await window.evaluate(() => {
      window.location.hash = "#/settings/archived"
    })
    await expect(window.getByText("已归档的聊天").first()).toBeVisible({ timeout: 8_000 })
    await expect(window.getByText(SEED)).toHaveCount(0)
    await expect(window.getByText("暂无已归档的聊天")).toBeVisible({ timeout: 8_000 })
    await window.screenshot({ path: join(shots, "archive-undo-archived-empty.png") })
  } finally {
    await closeApp(app)
  }
})

test("归档当前会话改选相邻项，toast 满 2s 仍在，撤销后重选", async () => {
  const app = await launchStub()
  if (!app) return
  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 920 })
    const target = sessionRow(window, SEED)
    await target.scrollIntoViewIfNeeded()
    await target.click()
    await archiveRow(window, target)
    await expect(sessionRow(window, SEED)).toHaveCount(0, { timeout: 8_000 })
    expect(await window.evaluate(() => window.location.hash)).not.toContain("/settings/archived")
    const toast = window.locator('[data-testid="session-archived-toast"]')
    await expect(toast).toBeVisible({ timeout: 8_000 })
    await window.waitForTimeout(2_000)
    await expect(toast).toBeVisible()
    await toast.locator("[data-action]").click()
    await expect(sessionRow(window, SEED)).toHaveCount(1, { timeout: 8_000 })
    await expect(sessionRow(window, SEED)).toHaveAttribute("data-session-name", SEED)
    await window.screenshot({ path: join(shots, "archive-current-undo.png") })
  } finally {
    await closeApp(app)
  }
})

async function launchStub(): Promise<ElectronApplication | null> {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return null
  }
  mkdirSync(shots, { recursive: true })
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: mkdtempSync(join(tmpdir(), "enjoy-undo-ws-")),
      ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-undo-ud-")),
      ENJOY_E2E_SESSION_COUNT: "30"
    }
  })
}

async function readyWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 20_000 })
  await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
    timeout: 20_000
  })
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
  return window
}

function sessionRow(window: Page, title: string) {
  return window.locator('[data-testid="sidebar-session-row"][data-session-surface="tree"]').filter({
    hasText: title
  })
}

async function sessionIndex(window: Page, title: string): Promise<number> {
  return window.evaluate((name) => {
    const rows = [...document.querySelectorAll('[data-testid="sidebar-session-row"][data-session-surface="tree"]')]
    return rows.findIndex((row) => row.getAttribute("data-session-name") === name)
  }, title)
}

async function archiveRow(window: Page, row: ReturnType<typeof sessionRow>) {
  await row.hover()
  await row.locator('[data-testid="session-row-menu"]').click()
  const archive = window.locator('[data-testid="session-row-menu-archive"]')
  await archive.waitFor({ timeout: 8_000 })
  await archive.click()
}

async function closeApp(app: ElectronApplication) {
  const proc = app.process()
  await Promise.race([app.close(), delay(1_500)]).catch(() => undefined)
  try {
    proc?.kill("SIGKILL")
  } catch {
    /* already gone */
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
