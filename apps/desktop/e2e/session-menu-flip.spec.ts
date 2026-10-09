/**
 * 底部会话「…」菜单须完整落在视口内；指针 Esc 不留焦点环，键盘 Esc 保留。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Locator, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("底部会话菜单完整落在视口内，归档可点，Esc 焦点环跟 :focus-visible", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-menu-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-menu-ud-"))
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
    await window.locator('[data-testid="session-row-menu"]').first().waitFor({ state: "attached", timeout: 8_000 })

    await assertMenuFits(window, { width: 1440, height: 920 }, "session-menu-low-1440.png")
    await assertMenuFits(window, { width: 1100, height: 920 }, "session-menu-low-1100.png")

    await window.setViewportSize({ width: 1440, height: 920 })
    await assertFocusRing(window)
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

async function assertMenuFits(window: Page, size: { width: number; height: number }, shot: string) {
  await window.setViewportSize(size)
  const trigger = await lastVisibleSessionMenu(window)
  await trigger.click({ force: true })
  const menu = window.locator('[data-testid="session-row-menu-content"]')
  await menu.waitFor({ timeout: 8_000 })
  const menuBox = await menu.boundingBox()
  const viewport = await window.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  expect(menuBox).toBeTruthy()
  if (menuBox) {
    expect(menuBox.x).toBeGreaterThanOrEqual(-0.5)
    expect(menuBox.y).toBeGreaterThanOrEqual(40)
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width + 0.5)
    expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height + 0.5)
  }
  const archive = window.locator('[data-testid="session-row-menu-archive"]')
  if ((await archive.count()) === 0) {
    await window.keyboard.press("Escape")
    throw new Error("last visible session menu has no archive item")
  }
  await expect(archive).toBeVisible()
  const archiveBox = await archive.boundingBox()
  expect(archiveBox).toBeTruthy()
  if (archiveBox) {
    expect(archiveBox.y).toBeGreaterThanOrEqual(0)
    expect(archiveBox.y + archiveBox.height).toBeLessThanOrEqual(viewport.height + 0.5)
  }
  await window.screenshot({ path: join(shots, shot) })
  await archive.click()
  await expect(menu).toBeHidden()
}

async function assertFocusRing(window: Page) {
  const trigger = await lastVisibleSessionMenu(window)
  await trigger.click({ force: true })
  await window.locator('[data-testid="session-row-menu-content"]').waitFor({ timeout: 8_000 })
  await window.keyboard.press("Escape")
  await expect(window.locator('[data-testid="session-row-menu-content"]')).toBeHidden()
  await expect.poll(() => trigger.evaluate((el) => el === document.activeElement)).toBe(true)
  expect(await trigger.evaluate((el) => (el as HTMLElement).hasAttribute("data-pointer-return"))).toBe(true)
  expect(await trigger.evaluate(hasVisibleFocusRing)).toBe(false)
  await window.screenshot({ path: join(shots, "session-menu-focus-pointer-esc.png") })

  await trigger.evaluate((el) => {
    delete (el as HTMLElement).dataset.pointerReturn
  })
  await trigger.focus()
  await window.keyboard.press("Enter")
  await window.locator('[data-testid="session-row-menu-content"]').waitFor({ timeout: 8_000 })
  await window.keyboard.press("Escape")
  await expect(window.locator('[data-testid="session-row-menu-content"]')).toBeHidden()
  await expect.poll(() => trigger.evaluate((el) => el === document.activeElement)).toBe(true)
  expect(await trigger.evaluate((el) => el.matches(":focus-visible"))).toBe(true)
  expect(await trigger.evaluate(hasVisibleFocusRing)).toBe(true)
  await window.screenshot({ path: join(shots, "session-menu-focus-keyboard-esc.png") })
}

function hasVisibleFocusRing(el: Element) {
  const style = getComputedStyle(el)
  if (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) return true
  const shadows = style.boxShadow
  if (!shadows || shadows === "none") return false
  return [...shadows.matchAll(/(-?\d+(?:\.\d+)?)px/g)]
    .map((match) => Number(match[1]))
    .some((value) => Math.abs(value) > 0.1)
}

async function lastVisibleSessionMenu(window: Page): Promise<Locator> {
  const triggers = window.locator('[data-testid="session-row-menu"]')
  await expect.poll(() => triggers.count()).toBeGreaterThan(8)
  const chosen = await window.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-testid="session-row-menu"]')]
    const vh = window.innerHeight
    let bestIndex = 0
    let bestBottom = -1
    nodes.forEach((node, index) => {
      const box = node.getBoundingClientRect()
      if (box.height <= 0) return
      if (box.top >= 44 && box.bottom <= vh && box.bottom > bestBottom) {
        bestBottom = box.bottom
        bestIndex = index
      }
    })
    return bestIndex
  })
  return triggers.nth(chosen)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
