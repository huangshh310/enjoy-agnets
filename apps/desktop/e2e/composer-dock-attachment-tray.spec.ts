/**
 * luna #155 巡检 P2（main c849e3f4）：Composer 上方的待验收条「未自动提交 · 1 个文件已改」
 * 盖住附件托盘，图片缩略图下半截被挡。1024 / 768 宽都能复现。
 * 根因：附件托盘靠 -mb 把底边塞进输入框下面，却排在待验收条上方，于是把待验收条拉上来叠在缩略图上。
 * 断言：有已改文件的待验收条 + 一张图片附件时，1024 / 768 / 733×480 下缩略图与条不重叠、整张可见，
 * 输入框完整可见、没被挤没。截图：设 ENJOY_E2E_SHOTS_DIR 时按尺寸落盘，另截一张深色。
 */
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Locator, type Page } from "@playwright/test"
import {
  bootPendingApproval,
  closeForRelaunch,
  firstWindow,
  mainEntry,
  stubPath
} from "./approval-restart-helpers"

const SIZES = [
  { width: 1024, height: 654 },
  { width: 768, height: 654 },
  { width: 733, height: 480 }
] as const
const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR

// 160x100 蓝色 PNG（与 first-send-image-only 同一张）。
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAAAsUlEQVR42u3RAQkAAAgEsY9jRBObwxoig0twS/XocbEAsAALsAALsAALMGABFmABFmABFmDAAizAAizAAizAAgxYgAVYgAVYgAUYsAALsAALsAALMGABFmABFmABFmABBizAAizAAizAAgxYgAVYgAVYgAUYsAuABViABViABViAAQuwAAuwAAuwAAMWYAEWYAEWYAEWYMACLMACLMACLMCABViABViABViAAQuwAOteC5G5PJKX/77QAAAAAElFTkSuQmCC",
  "base64"
)

type Box = { x: number; y: number; width: number; height: number }

test("有已改文件的待验收条 + 一张图片附件：缩略图不被条挡住，输入框不被挤没", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect.poll(() => existsSync(stubPath(env.workspace)), { timeout: 20_000 }).toBe(true)
    await expect(window.locator("body")).toContainText("stub-ok allowed write", { timeout: 20_000 })
    const gate = window.locator('[data-testid="review-gate-card"]')
    await expect(gate).toBeVisible({ timeout: 20_000 })
    await expect(gate).toContainText("未自动提交")

    await window.locator('[data-testid="composer-attach"]').setInputFiles({
      name: "blue.png",
      mimeType: "image/png",
      buffer: PNG
    })
    const chip = window.locator('[data-testid="composer-asset-chip"]')
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    await expect(chip.locator("img")).toBeVisible({ timeout: 8_000 })
    await window.locator('[data-testid="composer-input"]').fill("看看这张蓝图")

    for (const theme of ["light", "dark"] as const) {
      await setTheme(window, theme)
      for (const size of SIZES) {
        await window.setViewportSize(size)
        await window.waitForTimeout(500)
        const label = `${size.width}x${size.height} ${theme}`
        if (size.height > 640) await expect(gate).toContainText("1 个文件已改")
        await expectTrayClear(window, label, size)
        if (theme === "light" || size.width === 1024) {
          await snap(window, `${size.width}x${size.height}-dock-tray-${theme}`)
        }
      }
    }
    await setTheme(window, "light")
  } finally {
    await closeForRelaunch(env.app)
  }
})

async function expectTrayClear(window: Page, label: string, size: { width: number; height: number }): Promise<void> {
  const dock = await box(window.locator('[data-testid="composer-review-frame"]'))
  const tray = await box(window.locator('[data-testid="composer-attachment-tray"]'))
  const thumb = await box(window.locator('[data-testid="composer-asset-chip"]'))
  const form = await box(window.locator("form[data-composer]"))
  const input = await box(window.locator('[data-testid="composer-input"]'))
  const debug = JSON.stringify({ dock, tray, thumb, form, input })

  // 文档流上下排：条在上、托盘在下，互不覆盖。
  expect(intersects(thumb, dock), `${label}: thumbnail ∩ review dock ${debug}`).toBe(false)
  expect(intersects(tray, dock), `${label}: tray ∩ review dock ${debug}`).toBe(false)
  expect(thumb.y, `${label}: thumbnail above dock bottom ${debug}`).toBeGreaterThanOrEqual(dock.y + dock.height)
  expect(thumb.y + thumb.height, `${label}: thumbnail under composer ${debug}`).toBeLessThanOrEqual(form.y + 0.5)

  // 缩略图整张可见：四角与中心点命中的都是缩略图自己，没被别的层盖住或被裁掉。
  expect(thumb.y, `${label}: thumbnail above viewport`).toBeGreaterThanOrEqual(0)
  expect(thumb.y + thumb.height, `${label}: thumbnail below viewport`).toBeLessThanOrEqual(size.height)
  const hits = await window.locator('[data-testid="composer-asset-chip"]').evaluate((el) => {
    const r = el.getBoundingClientRect()
    // 圆角 rounded-xl（12px）：角点往里收 5px 才落在圆角内；底边中点收 2px。
    const inset = 5
    const points = [
      [r.left + inset, r.top + inset],
      [r.right - inset, r.top + inset],
      [r.left + inset, r.bottom - inset],
      [r.right - inset, r.bottom - inset],
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + r.width / 2, r.bottom - 2],
      [r.left + 2, r.top + r.height / 2],
      [r.right - 2, r.top + r.height / 2]
    ]
    return points.map(([x, y]) => {
      const hit = document.elementFromPoint(x, y)
      return { x, y, ok: !!hit && el.contains(hit), hit: hit ? `${hit.tagName}.${hit.getAttribute("data-testid") ?? ""}` : "none" }
    })
  })
  for (const hit of hits) {
    expect(hit.ok, `${label}: thumbnail covered at (${hit.x},${hit.y}) by ${hit.hit} ${debug}`).toBe(true)
  }

  // 小窗不能把输入框挤没：整个 Composer 在视口内、不被裁，输入框至少一行半高。
  expect(form.y + form.height, `${label}: composer cut off ${debug}`).toBeLessThanOrEqual(size.height)
  const formFull = await window.locator("form[data-composer]").evaluate((el) => el.scrollHeight <= el.clientHeight + 1)
  expect(formFull, `${label}: composer clipped`).toBe(true)
  expect(input.height, `${label}: input squeezed ${debug}`).toBeGreaterThanOrEqual(40)
  await expect(window.locator('[data-testid="composer-input"]')).toBeVisible()
  const conv = await box(window.locator('[data-testid="chat-conversation"]'))
  expect(conv.height, `${label}: messages squeezed out`).toBeGreaterThan(40)
}

async function box(locator: Locator): Promise<Box> {
  const value = await locator.boundingBox()
  expect(value).toBeTruthy()
  return value as Box
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

async function setTheme(window: Page, theme: "light" | "dark"): Promise<void> {
  const dark = await window.evaluate(() => document.documentElement.classList.contains("dark"))
  if (dark === (theme === "dark")) return
  await window.getByRole("button", { name: theme === "dark" ? "深色" : "浅色" }).click()
  await expect
    .poll(() => window.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(theme === "dark")
  await window.waitForTimeout(1_000)
}

async function snap(window: Page, name: string): Promise<void> {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}
