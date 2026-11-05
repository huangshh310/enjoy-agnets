/**
 * P2 侧栏 SessionList virtua soft · 真机自门 4 屏
 * 1 多会话滚动 · 2 高亮+菜单+钉住 · 3 跳转+主流程 · 4 零扩张
 * 预览 HTML 不算过门。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-sessionlist-virtua"

async function launch(env: Record<string, string> = {}) {
  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-sessionlist-virtua-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-sessionlist-virtua-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_SESSION_COUNT: "8",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ...env
    }
  })
}

async function waitBridge(window: Page) {
  await expect
    .poll(async () => window.evaluate(() => Boolean(window.__enjoyE2e?.seedManySessions)), {
      timeout: 45_000
    })
    .toBe(true)
}

test.describe("P2 sessionlist virtua gate", () => {
  test.setTimeout(180_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01–04 多会话 virtua / 高亮菜单钉住 / 跳转 / 零扩张", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const app = await launch()
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.setViewportSize({ width: 1280, height: 800 })
      const composer = window.locator('[data-testid="composer-input"]')
      await composer.waitFor({ timeout: 45_000 })
      await waitBridge(window)

      // ── 屏① 多会话：虚拟化生效（挂载行 ≪ 总数）──
      const seeded = await window.evaluate(() => window.__enjoyE2e!.seedManySessions!(48))
      expect(seeded.total).toBeGreaterThanOrEqual(40)
      await expect
        .poll(
          async () =>
            window.evaluate(() => Boolean(document.querySelector('[data-session-virtua="true"]'))),
          { timeout: 20_000 }
        )
        .toBe(true)
      await window.waitForTimeout(500)
      await window.evaluate(() => {
        const scroll = document.querySelector('[data-testid="sidebar-session-scroll"]')
        if (scroll) (scroll as HTMLElement).scrollTop = 240
      })
      await window.waitForTimeout(300)
      const sample = await window.evaluate(() => {
        const totalHint = document.querySelectorAll("[data-session-virtua-item]").length
        const mountedRows = document.querySelectorAll(
          '[data-testid="sidebar-session-row"][data-session-surface="tree"]'
        ).length
        const hasRoot = Boolean(document.querySelector('[data-session-virtua="true"]'))
        const tanstack = Boolean(
          document.querySelector("[data-tanstack-virtual], [data-radix-virtual]")
        )
        return { totalHint, mountedRows, hasRoot, tanstack }
      })
      expect(sample.hasRoot).toBe(true)
      expect(sample.mountedRows, "虚拟化后不应全量挂满 DOM").toBeLessThan(seeded.total)
      expect(sample.mountedRows).toBeGreaterThan(0)
      expect(sample.tanstack, "禁 tanstack 双挂痕迹").toBe(false)
      await window.screenshot({ path: join(SHOTS, "01-many-sessions-scroll.png") })

      // ── 屏② 高亮 + 行菜单 + 钉住组 ──
      await window.evaluate(() => window.__enjoyE2e!.setRunningForPin!(true))
      await window.waitForTimeout(200)
      // 点选一条可见树行
      const row = window.locator('[data-testid="sidebar-session-row"][data-session-surface="tree"]').first()
      await row.click()
      await window.waitForTimeout(200)
      const activeOk = await window.evaluate(() => {
        const active = document.querySelector(
          '[data-testid="sidebar-session-row"][data-session-surface="tree"][data-active="true"]'
        )
        return Boolean(active)
      })
      expect(activeOk, "点选后 data-active 准").toBe(true)

      // 打开行菜单（hover 显触发器）
      await row.hover()
      const menuBtn = row.locator('[data-testid="session-row-menu"]')
      await menuBtn.click({ force: true })
      const menu = window.locator('[data-testid="session-row-menu-content"]')
      await expect(menu).toBeVisible({ timeout: 5_000 })
      const pin = await window.evaluate(() => {
        const activeGroup = [...document.querySelectorAll("span")].some((el) =>
          /进行中|需处理/.test(el.textContent ?? "")
        )
        const activeRows = document.querySelectorAll(
          '[data-testid="sidebar-session-row"][data-session-surface="active"]'
        ).length
        return { activeGroup, activeRows }
      })
      expect(pin.activeRows > 0 || pin.activeGroup, "钉住组应可见可点").toBe(true)
      await window.screenshot({ path: join(SHOTS, "02-highlight-menu-pinned.png") })
      await window.keyboard.press("Escape")

      // ── 屏③ 跳转进视口 + 主流程 ──
      // 先滚走目标，再 select+reveal，验 scrollToIndex 非碰巧
      await window.evaluate(() => {
        const scroll = document.querySelector('[data-testid="sidebar-session-scroll"]') as HTMLElement | null
        if (scroll) scroll.scrollTop = 0
      })
      await window.waitForTimeout(150)
      const jumped = await window.evaluate(() => {
        const id = "e2e-sess-virtua-40"
        window.__enjoyE2e!.selectSessionById!(id)
        const ok = window.__enjoyE2e!.revealSidebarSession!(id)
        return { id, ok }
      })
      expect(jumped.ok, "sessionId→virtua scrollToIndex 应成功").toBe(true)
      await expect
        .poll(
          async () =>
            window.evaluate(() => {
              const active = document.querySelector(
                '[data-testid="sidebar-session-row"][data-session-id="e2e-sess-virtua-40"][data-session-surface="tree"]'
              )
              if (!(active instanceof HTMLElement)) return false
              const rect = active.getBoundingClientRect()
              return rect.top < window.innerHeight && rect.bottom > 0 && rect.height > 0
            }),
          { timeout: 5_000 }
        )
        .toBe(true)
      const jumpOk = await window.evaluate(() => {
        const active = document.querySelector(
          '[data-testid="sidebar-session-row"][data-session-id="e2e-sess-virtua-40"]'
        )
        if (!(active instanceof HTMLElement)) return { inView: false, flash: false, active: false }
        const rect = active.getBoundingClientRect()
        const inView = rect.top < window.innerHeight && rect.bottom > 0 && rect.height > 0
        const flash = Boolean(document.querySelector("[data-session-scroll-flash=true]"))
        return { inView, flash, active: active.getAttribute("data-active") === "true" }
      })
      expect(jumpOk.inView, "跳转目标行应在视口").toBe(true)

      // 主流程无死路：Composer / 新建 / 自动化入口
      await expect(composer).toBeVisible()
      await expect(window.locator('[data-testid="sidebar-new-session"]')).toBeVisible()
      await window.screenshot({ path: join(SHOTS, "03-jump-mainflow.png") })

      // ── 屏④ 零扩张 ──
      const zero = await window.evaluate(() => {
        const body = document.body.innerText
        const banned = /全面 virtua|性能大升级|性能翻倍|侧栏全面重构|事件总线已优化/.test(body)
        const hasTanstack = /@tanstack\/react-virtual/.test(
          [...document.scripts].map((s) => s.src).join("\n")
        )
        const sessionVirt = Boolean(document.querySelector('[data-session-virtua="true"]'))
        const threadVirt = Boolean(document.querySelector('[data-thread-virtua="true"]'))
        const composerOk = Boolean(document.querySelector('[data-testid="composer-input"]'))
        const dockInVirt = (() => {
          const dock = document.querySelector('[data-testid="permission-dock"]')
          const virt = document.querySelector('[data-session-virtua="true"]')
          return Boolean(dock && virt && virt.contains(dock))
        })()
        return { banned, hasTanstack, sessionVirt, threadVirt, composerOk, dockInVirt }
      })
      expect(zero.banned, "用户面禁空成功").toBe(false)
      expect(zero.hasTanstack).toBe(false)
      expect(zero.sessionVirt, "侧栏应有 virtua").toBe(true)
      expect(zero.threadVirt, "#213 线程 virtua 不回退").toBe(true)
      expect(zero.composerOk).toBe(true)
      expect(zero.dockInVirt, "Dock 禁进侧栏虚拟行").toBe(false)
      await window.screenshot({ path: join(SHOTS, "04-no-expansion.png") })

      writeFileSync(
        join(SHOTS, "gate-sample.json"),
        JSON.stringify(
          {
            seeded,
            sample,
            pin,
            jumpOk,
            zero,
            at: new Date().toISOString()
          },
          null,
          2
        )
      )
    } finally {
      await Promise.race([
        app.close(),
        new Promise((resolve) => setTimeout(resolve, 5_000))
      ])
    }
  })
})
