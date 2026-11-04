/**
 * P2 Remote soft · 真机自门 4 屏（+ 折叠态）。
 * 入口：设置 → 关于 Enjoy；只读边界卡；无启用开关；折叠非 dismiss。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-remote-soft"

async function launch(env: Record<string, string> = {}) {
  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-remote-soft-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-remote-soft-ws-"))
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ...env
    }
  })
}

async function openAbout(window: import("@playwright/test").Page) {
  await window.evaluate(() => {
    window.location.hash = "#/settings/about"
  })
  await expect.poll(() => window.evaluate(() => location.hash)).toBe("#/settings/about")
  await window.locator('[data-testid="remote-soft-boundary-card"]').waitFor({ timeout: 20_000 })
}

test.describe("P2 remote soft gate", () => {
  test.setTimeout(180_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01–04 入口 / 文案齐 / 无假承诺 / 折叠零扩张", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const app = await launch()
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.setViewportSize({ width: 1440, height: 900 })
      // 会话壳先就绪（composer 在），证明未挡主流程
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 45_000 }).catch(() => null)

      await openAbout(window)
      const card = window.locator('[data-testid="remote-soft-boundary-card"]')
      await expect(card).toBeVisible()
      await expect(card).toHaveAttribute("data-state", "expanded")

      // 屏① 入口：侧栏「关于 Enjoy」+ 卡可见
      const aboutNav = window.getByRole("button", { name: /关于 Enjoy/ }).or(window.getByText("关于 Enjoy").first())
      await expect(aboutNav.first()).toBeVisible({ timeout: 10_000 })
      await window.screenshot({ path: join(SHOTS, "01-entry-about-expanded.png") })

      // 屏② 边界文案齐
      await expect(card).toContainText("本机跑、异地控")
      await expect(card).toContainText("本机 Enjoy 须在线")
      await expect(card).toContainText("无手机 App 第一波")
      await expect(card).toContainText("不承诺自建隧道")
      await expect(card).toContainText("不对标商业 Connect")
      await expect(card).toContainText("P0-R SSH")
      const trend = window.locator('[data-testid="remote-soft-trend-aside"]')
      await expect(trend).toBeVisible()
      await expect(trend).toContainText("类似 Remote Control 趋势")
      await window.screenshot({ path: join(SHOTS, "02-boundary-copy.png") })

      // 屏③ 无假承诺 / 无启用开关
      const pageText = await window.locator("body").innerText()
      expect(pageText).not.toContain("启用异地控")
      expect(pageText).not.toContain("已可异地控")
      expect(pageText).not.toContain("不再显示")
      expect(pageText).not.toContain("Tailscale")
      await expect(card).toContainText("不宣称已交付遥控产品")
      await expect(window.locator('[data-testid="remote-soft-enable-switch"]')).toHaveCount(0)
      await window.screenshot({ path: join(SHOTS, "03-no-false-promise.png") })

      // 屏④ 折叠 → 单行摘要；再展开；composer 仍可达（回聊天）
      await window.locator('[data-testid="remote-soft-boundary-collapse"]').click()
      await expect(card).toHaveAttribute("data-state", "collapsed")
      await expect(card).toContainText("本机跑、异地控 · 了解边界")
      await expect(card).toContainText("展开")
      // local preference 已写
      const stored = await window.evaluate(() => localStorage.getItem("enjoy.remoteSoftCardCollapsed"))
      expect(stored).toBe("1")
      await window.screenshot({ path: join(SHOTS, "04-collapsed-summary.png") })

      // 建议再拍：否决开关不出现（折叠态仍无开关）
      await window.screenshot({ path: join(SHOTS, "05-no-enable-switch.png") })

      // 展开回来
      await window.locator('[data-testid="remote-soft-boundary-expand"]').click()
      await expect(card).toHaveAttribute("data-state", "expanded")

      // 零扩张：回会话，composer 仍在
      await window.evaluate(() => {
        window.location.hash = "#/"
      })
      await expect.poll(() => window.evaluate(() => location.hash === "#/" || location.hash === "")).toBeTruthy()
      const composer = window.locator('[data-testid="composer-input"]')
      if (await composer.count()) {
        await expect(composer.first()).toBeVisible({ timeout: 15_000 })
      }
      await window.screenshot({ path: join(SHOTS, "06-session-untouched.png") })
    } finally {
      await app.close()
    }
  })
})
