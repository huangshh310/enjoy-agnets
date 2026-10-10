/**
 * toast 悬停暂停；贴底 Composer 时 toast 顶在 Composer 之上，不盖「桌面」芯片。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import type { ElectronApplication } from "playwright"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"
const SEED = "Seed session 28"

test("归档 toast 悬停超过 5s 仍在，且不压贴底 Composer", async () => {
  const app = await launchStub()
  if (!app) return
  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 920 })
    const composer = window.locator('[data-testid="composer-input"]')
    await sendComposer(window, composer, "dock composer for toast")
    await expect(window.locator('[data-chat-conversation], [data-testid="chat-conversation"]').first()).toBeVisible({
      timeout: 15_000
    })

    const target = sessionRow(window, SEED)
    await target.scrollIntoViewIfNeeded()
    await archiveRow(window, target)
    const toast = window.locator('[data-testid="session-archived-toast"]')
    await expect(toast).toBeVisible({ timeout: 8_000 })

    const toastBox = await toast.boundingBox()
    const formBox = await window.locator("[data-composer=true]").boundingBox()
    expect(toastBox).toBeTruthy()
    expect(formBox).toBeTruthy()
    if (toastBox && formBox && formBox.y > 600) {
      expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(formBox.y + 4)
    }

    await toast.hover()
    await window.waitForTimeout(6_000)
    await expect(toast).toBeVisible()
    await window.screenshot({ path: join(shots, "b6_toast_hover_pause.png") })
  } finally {
    await closeApp(app)
  }
})

async function launchStub(): Promise<ElectronApplication | null> {
  test.setTimeout(180_000)
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
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: mkdtempSync(join(tmpdir(), "enjoy-toast-ws-")),
      ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-toast-ud-")),
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
