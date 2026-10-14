/**
 * luna z151-1 / z151-2 / jojo P2：
 * - 440×600 窄窗展开侧栏是浮层：主区宽度不变，遮罩/Esc 关掉，不写收起偏好；宽窗仍是推挤布局。
 * - 会话行标题不再被固定时间列和隐藏菜单钮挤成 ~3 字；悬停/键盘聚焦时菜单钮叠在时间位上。
 * - 自动化抽屉：首次打开原因是中性灰；只填提示词时说「填写名称后才能保存」，保存与立即运行置灰。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时落盘。
 */
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { bootPendingApproval, closeForRelaunch, firstWindow, mainEntry } from "./approval-restart-helpers"

const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR

test("窄窗侧栏浮层、会话标题宽度、自动化抽屉提示", async () => {
  test.setTimeout(300_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await window.waitForTimeout(800)

    // —— z151-2：宽窗下会话标题完整 ——
    await window.setViewportSize({ width: 1440, height: 920 })
    await window.waitForTimeout(600)
    const row = window.locator('[data-testid="sidebar-session-row"]').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    const title = row.locator("span.truncate").first()
    const fit = await title.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, text: el.textContent }))
    expect(fit.sw <= fit.cw + 1, `title clipped ${JSON.stringify(fit)}`).toBe(true)
    // 极长标题：可用宽度至少占行宽一半（原来时间列 + 隐藏菜单钮把标题挤到 ~3 字）。
    const ratio = await row.evaluate((el) => {
      const span = el.querySelector("span.truncate") as HTMLElement
      const old = span.textContent
      span.textContent = "很长很长的会话标题用来量一下标题到底能显示多宽".repeat(2)
      const r = span.getBoundingClientRect().width / el.getBoundingClientRect().width
      span.textContent = old
      return r
    })
    expect(ratio, `title/row ratio ${ratio}`).toBeGreaterThan(0.5)
    await snap(window, "1440x920-sidebar-title")
    // 键盘：聚焦标题按钮后菜单钮可见、Tab 能到。
    await row.locator("button").first().focus()
    const menu = row.locator('[data-testid="session-row-menu"]')
    await expect.poll(() => menu.evaluate((el) => getComputedStyle(el).opacity)).toBe("1")
    await window.keyboard.press("Tab")
    await expect(menu).toBeFocused()
    await snap(window, "1440x920-sidebar-title-focus-menu")
    await row.hover()
    await window.waitForTimeout(200)
    await snap(window, "1440x920-sidebar-title-hover")
    await window.mouse.move(900, 500)

    // —— 宽窗：展开是推挤布局，不是浮层 ——
    await expect(window.locator('[data-testid="nav-card"]')).toHaveAttribute("data-overlay", "false")

    // —— z151-1：440×600 窄窗浮层 ——
    await window.setViewportSize({ width: 440, height: 600 })
    await window.waitForTimeout(600)
    const nav = window.locator('[data-testid="nav-card"]')
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    const main = window.locator('[data-testid="composer-input"]').first()
    const before = await main.boundingBox()
    await snap(window, "440x600-collapsed")
    await window.locator('[data-testid="sidebar-toggle"]').first().click()
    await expect(nav).toHaveAttribute("data-overlay", "true")
    await expect(window.locator('[data-testid="nav-card-scrim"]')).toBeVisible()
    await window.waitForTimeout(400)
    const after = await main.boundingBox()
    expect(after?.width, "主区不被挤压").toBe(before?.width)
    expect(after!.width).toBeGreaterThan(250)
    // 焦点进了浮层。
    expect(await nav.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await snap(window, "440x600-overlay-open")
    await window.keyboard.press("Escape")
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    await expect(window.locator('[data-testid="nav-card-scrim"]')).toHaveCount(0)
    // 点外部关浮层同样不写偏好。
    await window.locator('[data-testid="sidebar-toggle"]').first().click()
    await expect(nav).toHaveAttribute("data-overlay", "true")
    await window.mouse.click(420, 300)
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    expect(await window.evaluate(() => localStorage.getItem("enjoy.sidebarCollapsed"))).not.toBe("1")
    // 回到宽窗：恢复偏好（展开、推挤）。
    await window.setViewportSize({ width: 1440, height: 920 })
    await window.waitForTimeout(600)
    await expect(nav).toHaveAttribute("data-collapsed", "false")
    await expect(nav).toHaveAttribute("data-overlay", "false")

    // 733×480：宽于断点，行为不变。
    await window.setViewportSize({ width: 733, height: 480 })
    await window.waitForTimeout(600)
    await expect(nav).toHaveAttribute("data-overlay", "false")
    await snap(window, "733x480-sidebar")

    // —— jojo P2：自动化抽屉 ——
    await window.setViewportSize({ width: 1440, height: 920 })
    await window.evaluate(() => {
      location.hash = "#/automations"
    })
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    await window.getByRole("button", { name: "新建", exact: true }).first().click()
    const save = window.locator('[data-testid="automation-save"]')
    await expect(save).toBeVisible({ timeout: 10_000 })
    const reason = window.locator('[data-testid="automation-save-reason"]')
    await expect(reason).toHaveText("填写名称和提示词后才能保存")
    await expect(reason).toHaveAttribute("data-tone", "neutral")
    await expect(save).toBeDisabled()
    const runNow = window.locator('[data-testid="automation-run-now"]')
    await expect(runNow).toBeDisabled()
    await snap(window, "1440x920-automation-drawer-first-open")
    const nameInput = window.locator('[role="dialog"] input').first()
    await nameInput.fill("")
    await window.locator('[role="dialog"] textarea').first().fill("跑一下类型检查")
    await expect(reason).toHaveText("填写名称后才能保存")
    await expect(reason).toHaveAttribute("data-tone", "error")
    await expect(save).toBeDisabled()
    await expect(runNow).toBeDisabled()
    await snap(window, "1440x920-automation-drawer-prompt-only")
    await nameInput.fill("晨间类型检查")
    await expect(reason).toHaveCount(0)
    await expect(save).toBeEnabled()
    await snap(window, "1440x920-automation-drawer-ready")
  } finally {
    await closeForRelaunch(env.app)
  }
})

test("英文：抽屉只填提示词提示填名称；顺手项文案（Skills 标题、收件箱搜索、设置自动放行）", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ lang: "en" })
  try {
    const window = await firstWindow(env.app)
    await window.setViewportSize({ width: 1440, height: 920 })
    const go = async (hash: string) => {
      await window.evaluate((h) => {
        location.hash = h
      }, hash)
      await window.waitForTimeout(600)
    }
    await go("#/automations")
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    await window.getByRole("button", { name: "New", exact: true }).first().click()
    const reason = window.locator('[data-testid="automation-save-reason"]')
    await expect(reason).toHaveText("Fill in the name and prompt to save")
    await expect(reason).toHaveAttribute("data-tone", "neutral")
    await window.locator('[role="dialog"] textarea').first().fill("Run the type check")
    await expect(reason).toHaveText("Fill in the name to save")
    await expect(window.locator('[data-testid="automation-save"]')).toBeDisabled()
    await snap(window, "1440x920-en-automation-drawer-prompt-only")
    await window.keyboard.press("Escape")
    await window.waitForTimeout(300)
    const discard = window.getByRole("button", { name: "Discard" })
    if (await discard.isVisible().catch(() => false)) await discard.click()

    await go("#/inbox")
    await expect(window.getByPlaceholder("Search inbox").first()).toBeVisible({ timeout: 15_000 })
    await snap(window, "1440x920-en-inbox-search")
    await go("#/settings/general")
    await expect(window.locator("body")).toContainText("Runs without asking")
    await expect(window.locator("body")).not.toContainText("Auto-run flags")
    await snap(window, "1440x920-en-settings-general")
    await go("#/settings/skills")
    await expect(window.locator("h1", { hasText: "Skills" }).first()).toBeVisible({ timeout: 15_000 })
    await expect(window.locator("h1", { hasText: "技能" })).toHaveCount(0)
    await snap(window, "1440x920-en-skills")
  } finally {
    await closeForRelaunch(env.app)
  }
})

async function snap(window: Page, name: string): Promise<void> {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}
