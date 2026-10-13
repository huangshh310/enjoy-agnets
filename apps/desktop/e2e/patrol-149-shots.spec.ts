/**
 * luna #149 / jojo main-146 巡检：收件箱窄窗、去 ses_ / 工具名 / 藏噪音，技能标题，自动化「保存」可见。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时按 页面 × 尺寸 × 浅/深 落盘。
 */
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { bootPendingApproval, closeForRelaunch, firstWindow, mainEntry } from "./approval-restart-helpers"

const SIZES = [
  { width: 733, height: 480 },
  { width: 1440, height: 920 }
] as const
const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR

test("巡检页：收件箱 / 技能 / MCP / 自动化抽屉 在 733 与 1440、浅深色下可读", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    for (const theme of ["light", "dark"] as const) {
      await setTheme(window, theme)
      for (const size of SIZES) {
        await window.setViewportSize(size)
        const tag = `${size.width}x${size.height}`

        await go(window, "#/inbox")
        await window.locator('[data-testid="page-inbox"]').waitFor({ timeout: 15_000 })
        await window.locator('[data-testid="inbox-row"]').first().click()
        await window.waitForTimeout(500)
        const body = window.locator("body")
        await expect(body).not.toContainText("藏噪音")
        await expect(body).not.toContainText("ses_")
        await expect(body).not.toContainText("工具调用")
        // 「立即前往审批」只出现一次。
        expect(await window.getByText("立即前往审批").count(), `${tag} approval action dup`).toBeLessThanOrEqual(1)
        // 详情栏右边不出窗。
        const markRead = window.locator("header button").filter({ has: window.locator("svg") }).last()
        const mr = await markRead.boundingBox()
        expect(mr && mr.x + mr.width, `${tag} inbox action off screen`).toBeLessThanOrEqual(size.width)
        // 列表顶栏按钮不溢进详情栏（luna #149 v3：「全部标为已读 / 清理已读」压住「拍板」）。
        const head = await window.locator('[data-testid="page-inbox"]').boundingBox()
        for (const btn of await window.locator('[data-testid="page-inbox"] button').all()) {
          const bb = await btn.boundingBox()
          if (bb && head) expect(bb.x + bb.width, `${tag} inbox toolbar spill`).toBeLessThanOrEqual(head.x + head.width + 0.5)
        }
        // 详情顶栏：「拍板」标签文字整块可见，不与任何动作按钮相交（luna #149）。
        const badgeText = window.locator('[data-testid="inbox-reader-badge-text"]')
        const bt = await badgeText.boundingBox()
        expect(bt, `${tag} badge missing`).toBeTruthy()
        for (const btn of await window.locator('[data-testid="inbox-reader-actions"] button').all()) {
          const bb = await btn.boundingBox()
          if (!bb || !bt) continue
          const hit = bt.x < bb.x + bb.width && bb.x < bt.x + bt.width && bt.y < bb.y + bb.height && bb.y < bt.y + bt.height
          expect(hit, `${tag} badge ∩ header action ${JSON.stringify({ bt, bb })}`).toBe(false)
        }
        const badgeVisible = await badgeText.evaluate((el) => {
          const r = el.getBoundingClientRect()
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const cs = getComputedStyle(p)
            if (cs.overflowX === "visible" && cs.overflowY === "visible") continue
            const c = p.getBoundingClientRect()
            if (r.left < c.left - 0.5 || r.right > c.right + 0.5 || r.top < c.top - 0.5 || r.bottom > c.bottom + 0.5) return false
          }
          for (const x of [r.left + 1, (r.left + r.right) / 2, r.right - 1]) {
            const at = document.elementFromPoint(x, (r.top + r.bottom) / 2)
            if (!at || !(el === at || el.contains(at) || at.contains(el))) return false
          }
          return el.scrollWidth <= el.clientWidth + 1
        })
        expect(badgeVisible, `${tag} badge text not fully visible`).toBe(true)
        await snap(window, `${tag}-inbox-${theme}`)

        await go(window, "#/skills")
        await window.waitForTimeout(800)
        await expect(window.getByText("技能", { exact: true }).first()).toBeVisible()
        await snap(window, `${tag}-skills-${theme}`)

        await go(window, "#/mcp")
        await window.locator('[data-testid="page-mcp"]').waitFor({ timeout: 15_000 })
        await expect(body).toContainText("本机命令服务（STDIO）")
        await snap(window, `${tag}-mcp-${theme}`)

        await go(window, "#/automations")
        await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
        await expect(body).toContainText("推送只在这台电脑上收发，不会发到网上")
        await snap(window, `${tag}-automations-${theme}`)
        await window.locator('[data-testid="automation-row"]').first().click()
        const save = window.locator('[data-testid="automation-save"]')
        await expect(save).toBeVisible({ timeout: 10_000 })
        await saveStyle(save, `${tag} ${theme} enabled`)
        await snap(window, `${tag}-automation-drawer-${theme}`)
        // 清空名字 → 「保存」禁用：要有描边、文字与底不同色。
        const name = window.locator('[role="dialog"] input').first()
        if ((await name.count()) > 0) {
          await name.fill("")
          if (await save.isDisabled()) {
            const style = await saveStyle(save, `${tag} ${theme} disabled`)
            expect(parseFloat(style.border), `${tag} disabled save has no border`).toBeGreaterThan(0)
            await snap(window, `${tag}-automation-drawer-disabled-${theme}`)
          }
        }
        await window.keyboard.press("Escape")
        await window.waitForTimeout(300)
        await window.keyboard.press("Escape")
        await go(window, "#/")
      }
    }
    await go(window, "#/")
    await setTheme(window, "light")
  } finally {
    await closeForRelaunch(env.app)
  }
})

async function saveStyle(save: import("@playwright/test").Locator, label: string) {
  await save.page().waitForTimeout(400)
  const style = await save.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { border: cs.borderTopWidth, borderColor: cs.borderTopColor, color: cs.color, bg: cs.backgroundColor }
  })
  console.log(`[automation-save] ${label} ${JSON.stringify(style)}`)
  expect(style.color, `${label}: text same as bg`).not.toBe(style.bg)
  return style
}

async function go(window: Page, hash: string): Promise<void> {
  await window.evaluate((h) => {
    location.hash = h
  }, hash)
  await window.waitForTimeout(400)
}

async function setTheme(window: Page, theme: "light" | "dark"): Promise<void> {
  const dark = await window.evaluate(() => document.documentElement.classList.contains("dark"))
  if (dark === (theme === "dark")) return
  await window.getByRole("button", { name: theme === "dark" ? "深色" : "浅色" }).click()
  await expect
    .poll(() => window.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(theme === "dark")
  await window.waitForTimeout(800)
}

async function snap(window: Page, name: string): Promise<void> {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}
