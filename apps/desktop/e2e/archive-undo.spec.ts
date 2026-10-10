/**
 * 归档非当前会话后点 toast「撤销」：行回到原下标，已归档名单为空。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"
const SEED = "Seed session 28"

test("归档非当前会话后撤销，行回到原位且已归档为空", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-undo-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-undo-ud-"))
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
      ENJOY_E2E_SESSION_COUNT: "30"
    }
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
      timeout: 20_000
    })
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
    await window.setViewportSize({ width: 1440, height: 920 })

    const other = sessionRow(window, "Seed session 01")
    await other.scrollIntoViewIfNeeded()
    await other.click()

    const target = sessionRow(window, SEED)
    await target.scrollIntoViewIfNeeded()
    const before = await sessionIndex(window, SEED)
    expect(before).toBeGreaterThanOrEqual(0)

    await archiveRow(window, target)
    await expect(sessionRow(window, SEED)).toHaveCount(0, { timeout: 8_000 })

    const toast = window.locator('[data-testid="session-archived-toast"]')
    await expect(toast).toBeVisible({ timeout: 8_000 })
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
    const proc = app.process()
    await Promise.race([app.close(), delay(1_500)]).catch(() => undefined)
    try {
      proc?.kill("SIGKILL")
    } catch {
      /* already gone */
    }
  }
})

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
