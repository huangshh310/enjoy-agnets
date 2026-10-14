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
import { sendComposer } from "./send-composer"

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

    // 733×480：低于 768 也算窄窗（jojo #154）：自动收起，展开是浮层、主区不挤。
    await window.setViewportSize({ width: 733, height: 480 })
    await window.waitForTimeout(600)
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    const main733 = await main.boundingBox()
    await snap(window, "733x480-sidebar")
    await window.locator('[data-testid="sidebar-toggle"]').first().click()
    await expect(nav).toHaveAttribute("data-overlay", "true")
    await window.waitForTimeout(400)
    expect((await main.boundingBox())?.width).toBe(main733?.width)
    await snap(window, "733x480-sidebar-overlay")
    await window.keyboard.press("Escape")
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    // 768 起是停靠布局。
    await window.setViewportSize({ width: 768, height: 600 })
    await window.waitForTimeout(600)
    await expect(nav).toHaveAttribute("data-collapsed", "false")
    await expect(nav).toHaveAttribute("data-overlay", "false")
    await snap(window, "768x600-sidebar-docked")

    // —— leo #154 S1：浮层内 Tab 循环不出浮层 ——
    await window.setViewportSize({ width: 440, height: 600 })
    await window.waitForTimeout(600)
    const toggle = window.locator('[data-testid="sidebar-toggle"]').first()
    await toggle.click()
    await expect(nav).toHaveAttribute("data-overlay", "true")
    for (let i = 0; i < 30; i++) {
      await window.keyboard.press(i % 2 ? "Tab" : "Shift+Tab")
      if (i % 5 === 0) expect(await nav.evaluate((el) => el.contains(document.activeElement)), `tab ${i}`).toBe(true)
    }
    for (let i = 0; i < 30; i++) await window.keyboard.press("Tab")
    expect(await nav.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    // S-a：页面无元素聚焦时 Esc 也能关。
    await window.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await window.keyboard.press("Escape")
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    await toggle.click()
    await expect(nav).toHaveAttribute("data-overlay", "true")
    // —— S3：点当前会话也关浮层 ——
    await nav.locator('[data-testid="sidebar-session-row"] button').first().click()
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    // —— S3：轨道切模块关浮层 ——
    await toggle.click()
    await expect(nav).toHaveAttribute("data-overlay", "true")
    await window.locator('[data-testid="rail-knowledge"]').click()
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    await window.evaluate(() => {
      location.hash = "#/"
    })
    await window.waitForTimeout(400)

    // —— leo #154 M1：偏好收起 → 窄窗开关开浮层 → 关 → 变宽：仍收起，偏好不变 ——
    await window.setViewportSize({ width: 1440, height: 920 })
    await window.waitForTimeout(600)
    await toggle.click()
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    expect(await window.evaluate(() => localStorage.getItem("enjoy.sidebarCollapsed"))).toBe("1")
    await window.setViewportSize({ width: 440, height: 600 })
    await window.waitForTimeout(600)
    await toggle.click()
    await expect(nav).toHaveAttribute("data-overlay", "true")
    expect(await window.evaluate(() => localStorage.getItem("enjoy.sidebarCollapsed"))).toBe("1")
    await snap(window, "440x600-overlay-pref-collapsed")
    await toggle.click({ force: true })
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    expect(await window.evaluate(() => localStorage.getItem("enjoy.sidebarCollapsed"))).toBe("1")
    await window.setViewportSize({ width: 1440, height: 920 })
    await window.waitForTimeout(600)
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    await toggle.click()
    await expect(nav).toHaveAttribute("data-collapsed", "false")

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
    // jojo #154 P3：未保存时置灰的立即运行 tooltip 写「先保存再运行」。
    await expect(window.locator('[data-testid="automation-run-now-wrap"]')).toHaveAttribute("title", "先保存再运行")
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
    // jojo #154 P3：已保存的自动化，删除在左侧单独区域，和立即运行拉开距离。
    await window.keyboard.press("Escape")
    await window.waitForTimeout(300)
    const discard = window.getByRole("button", { name: "放弃" })
    if (await discard.isVisible().catch(() => false)) await discard.click()
    await window.locator('[data-testid="automation-row"]').first().click()
    const del = window.locator('[data-testid="automation-delete"]')
    await expect(del).toBeVisible({ timeout: 10_000 })
    const delBox = await del.boundingBox()
    const runOrSave = (await window.locator('[data-testid="automation-run-now"]').count())
      ? window.locator('[data-testid="automation-run-now"]')
      : window.locator('[data-testid="automation-save"]')
    const rightBox = await runOrSave.boundingBox()
    expect(rightBox!.x - (delBox!.x + delBox!.width), "删除与运行 / 保存拉开距离").toBeGreaterThan(80)
    await window.waitForTimeout(600)
    await snap(window, "1440x920-automation-drawer-saved-delete-left")
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
    await expect(window.locator('[data-testid="automation-run-now-wrap"]')).toHaveAttribute("title", "Save first to run")
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

test("440 浮层：点击 / 回车切到另一个会话、看板 / 自动化入口关浮层、浮层内 Shift+Tab 不改权限、输入框内改权限有提示（luna #154）", async () => {
  test.setTimeout(300_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-deny"]').click({ timeout: 15_000, force: true })
    await window.waitForTimeout(500)
    // 第二个会话。
    await window.getByText("新对话", { exact: true }).first().click()
    await window.waitForTimeout(500)
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "second session")
    await window.locator('[data-testid="approval-deny"]').click({ timeout: 8_000, force: true }).catch(() => {})
    const rows = window.locator('[data-testid="sidebar-session-row"]')
    await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThanOrEqual(2)

    await window.setViewportSize({ width: 440, height: 600 })
    await window.waitForTimeout(600)
    const nav = window.locator('[data-testid="nav-card"]')
    const toggle = window.locator('[data-testid="sidebar-toggle"]').first()
    const activeId = () => window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first().getAttribute("data-session-id")
    const openOverlay = async () => {
      await toggle.click()
      await expect(nav).toHaveAttribute("data-overlay", "true")
    }

    // —— 1. 点击切到另一个会话 ——
    for (const how of ["click", "enter"] as const) {
      await openOverlay()
      const current = await activeId()
      const target = nav.locator(`[data-testid="sidebar-session-row"][data-active="false"]`).first()
      const targetId = await target.getAttribute("data-session-id")
      expect(targetId).toBeTruthy()
      expect(targetId).not.toBe(current)
      await snap(window, `440x600-overlay-before-${how}-switch`)
      if (how === "click") await target.locator("button").first().click()
      else {
        await target.locator("button").first().focus()
        await window.keyboard.press("Enter")
      }
      await expect(nav).toHaveAttribute("data-collapsed", "true")
      await openOverlay()
      await expect.poll(activeId, { timeout: 10_000 }).toBe(targetId)
      await snap(window, `440x600-overlay-after-${how}-switch`)
      await window.keyboard.press("Escape")
      await expect(nav).toHaveAttribute("data-collapsed", "true")
    }

    // —— 2. 看板 / 自动化入口关浮层 ——
    for (const [label, testId] of [
      ["自动化", "page-automations"],
      ["看板", null]
    ] as const) {
      await window.evaluate(() => {
        location.hash = "#/"
      })
      await window.waitForTimeout(400)
      await openOverlay()
      const before = await window.evaluate(() => location.hash)
      await nav.getByText(label, { exact: true }).first().click()
      await expect.poll(() => window.evaluate(() => location.hash)).not.toBe(before)
      if (testId) await expect(window.locator(`[data-testid="${testId}"]`)).toBeVisible({ timeout: 10_000 })
      await expect(nav).toHaveAttribute("data-collapsed", "true")
      await expect(window.locator('[data-testid="nav-card-scrim"]')).toHaveCount(0)
      await snap(window, `440x600-overlay-after-${label === "看板" ? "board" : "automations"}`)
    }
    await window.evaluate(() => {
      location.hash = "#/"
    })
    await window.waitForTimeout(500)

    // —— 3. 浮层内 Shift+Tab 不改权限 ——
    await openOverlay()
    for (let i = 0; i < 6; i++) await window.keyboard.press("Shift+Tab")
    expect(await nav.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await window.waitForTimeout(400)
    await expect(window.locator('[data-testid="permission-cycled-toast"]')).toHaveCount(0)
    await expect(window.locator("body")).not.toContainText("权限已切到")
    await snap(window, "440x600-overlay-shift-tab-no-permission-change")
    await window.keyboard.press("Escape")
    await expect(nav).toHaveAttribute("data-collapsed", "true")
    // 焦点在页面别处（非 Composer）也不改。
    await window.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await window.keyboard.press("Shift+Tab")
    await window.waitForTimeout(300)
    await expect(window.locator("body")).not.toContainText("权限已切到")

    // —— leo #154 S3：轨道里再点当前模块也关浮层 ——
    await openOverlay()
    await window.locator('[data-testid="rail-chat"]').click()
    await expect(nav).toHaveAttribute("data-collapsed", "true")

    // —— 输入框内（空）Shift+Tab 改权限并提示 ——
    await window.setViewportSize({ width: 1440, height: 920 })
    await window.waitForTimeout(500)
    const composer = window.locator('[data-testid="composer-input"]').first()
    // leo #154 B2：焦点在 Composer 里的按钮（附件 / 模型 / 盾牌等）上（不是输入框本身）不切权限。
    await composer.fill("")
    await window.locator('[data-composer] button:visible').first().focus()
    await window.keyboard.press("Shift+Tab")
    await window.waitForTimeout(500)
    await expect(window.locator("body")).not.toContainText("权限已切到")
    await composer.fill("")
    await composer.focus()
    await window.keyboard.press("Shift+Tab")
    await expect(window.locator("body")).toContainText("权限已切到「编辑」", { timeout: 5_000 })
    await snap(window, "1440x920-composer-shift-tab-toast")
    await composer.focus()
    await window.keyboard.press("Shift+Tab")
    await expect(window.locator("body")).toContainText("权限已切到「读取」", { timeout: 5_000 })
  } finally {
    await closeForRelaunch(env.app)
  }
})

async function snap(window: Page, name: string): Promise<void> {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}
