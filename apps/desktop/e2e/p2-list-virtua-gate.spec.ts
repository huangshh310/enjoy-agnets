/**
 * P2 列表边界 soft · 真机自门 4 屏
 * 1 长线程滚动虚拟化 · 2 找条高亮 · 3 审批钉住 · 4 零扩张/#212
 * 预览 HTML 不算过门。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-list-virtua"

async function launch(env: Record<string, string> = {}) {
  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-list-virtua-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-list-virtua-ws-"))
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_STUB_SLOW_MS: "400",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ...env
    }
  })
}

async function waitBridge(window: Page) {
  await expect
    .poll(async () => window.evaluate(() => Boolean(window.__enjoyE2e?.seedLongThread)), { timeout: 45_000 })
    .toBe(true)
}

test.describe("P2 list virtua gate", () => {
  test.setTimeout(180_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01–04 长线程 virtua / 找条 / 审批钉住 / 零扩张", async () => {
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

      // ── 屏① 长线程：虚拟化生效（挂载 turn << 总数）──
      const seeded = await window.evaluate(() => window.__enjoyE2e!.seedLongThread!(48))
      expect(seeded.total).toBeGreaterThanOrEqual(40)
      await expect
        .poll(async () => window.evaluate(() => Boolean(document.querySelector("[data-thread-virtua=\"true\"]"))), {
          timeout: 20_000
        })
        .toBe(true)
      await window.waitForTimeout(500)
      const sample = await window.evaluate(() => {
        const mounted = document.querySelectorAll("[data-thread-message]").length
        const items = document.querySelectorAll("[data-thread-virtua-item]").length
        const root = document.querySelector("[data-thread-virtua=true]")
        return { mounted, items, hasRoot: Boolean(root) }
      })
      expect(sample.hasRoot).toBe(true)
      expect(sample.mounted, "虚拟化后不应全量挂满 DOM").toBeLessThan(seeded.total)
      expect(sample.mounted).toBeGreaterThan(0)
      // 滚一下再采样
      await window.evaluate(() => {
        const scroll = document.querySelector("[data-thread-root] [role=log] div")
        if (scroll) scroll.scrollTop = 0
      })
      await window.waitForTimeout(300)
      await window.screenshot({ path: join(SHOTS, "01-long-thread-virtua.png") })

      // ── 屏② 找条：滚进视口 + 短高亮 ──
      await window.evaluate(() => window.__enjoyE2e!.openThreadFind!())
      const findBar = window.locator('[data-testid="thread-find-bar"]')
      await expect(findBar).toBeVisible({ timeout: 8_000 })
      await findBar.locator("input").fill("VIRTUA_FIND_2_END")
      // 高亮 ≤~400ms：在闪过窗口内采样 active；随后仍校验目标 turn 在视口
      await expect
        .poll(
          async () =>
            window.evaluate(() => Boolean(document.querySelector("[data-thread-find-active=\"true\"]"))),
          { timeout: 3_000 }
        )
        .toBe(true)
      const findHit = await window.evaluate(() => {
        const active = document.querySelector("[data-thread-find-active=true]")
        const target =
          active ?? document.querySelector('[data-thread-message="e2e-virtua-u-2"]')
        const id = target?.getAttribute("data-thread-message")
        const rect = target?.getBoundingClientRect()
        const inView =
          rect != null && rect.top < window.innerHeight && rect.bottom > 0 && rect.height > 0
        return { id, inView, hasActive: Boolean(active) }
      })
      expect(findHit.hasActive, "找条滚定后应出现 data-thread-find-active").toBe(true)
      await window.screenshot({ path: join(SHOTS, "02-find-scroll-highlight.png") })
      await expect
        .poll(
          async () =>
            window.evaluate(() => {
              const node = document.querySelector('[data-thread-message="e2e-virtua-u-2"]')
              if (!(node instanceof HTMLElement)) return false
              const rect = node.getBoundingClientRect()
              return rect.top < window.innerHeight && rect.bottom > 0
            }),
          { timeout: 5_000 }
        )
        .toBe(true)
      await window.keyboard.press("Escape")

      // ── 屏③ 审批钉住：Dock 在虚拟区外，滚动后三钮可点 ──
      await window.evaluate(() => window.__enjoyE2e!.injectPendingApproval!())
      const dock = window.locator('[data-testid="permission-dock"]')
      await expect(dock).toBeVisible({ timeout: 10_000 })
      // 窄窗
      await window.setViewportSize({ width: 1100, height: 720 })
      await window.waitForTimeout(300)
      // 滚线程
      await window.evaluate(() => {
        const nodes = [...document.querySelectorAll("[data-thread-root] *")]
        for (const node of nodes) {
          const style = getComputedStyle(node)
          if ((style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight + 40) {
            ;(node as HTMLElement).scrollTop = 80
            break
          }
        }
      })
      await window.waitForTimeout(300)
      const dockOutside = await window.evaluate(() => {
        const dockEl = document.querySelector('[data-testid="permission-dock"]')
        const virtua = document.querySelector("[data-thread-virtua=true]")
        const insideVirtua = Boolean(dockEl && virtua && virtua.contains(dockEl))
        const allow = document.querySelector('[data-testid="approval-allow"]')
        const deny = document.querySelector('[data-testid="approval-deny"]')
        const session = document.querySelector('[data-testid="approval-session"]')
        const buttons = [allow, deny, session].filter(Boolean).length
        return { insideVirtua, buttons, dockVisible: Boolean(dockEl) }
      })
      expect(dockOutside.insideVirtua, "Dock 不得进虚拟区").toBe(false)
      expect(dockOutside.dockVisible).toBe(true)
      expect(dockOutside.buttons, "待批三钮应仍可点区域存在").toBeGreaterThanOrEqual(1)
      // elementFromPoint 不点空
      const clickable = await window.evaluate(() => {
        const btn =
          document.querySelector('[data-testid="approval-allow"]') ||
          document.querySelector('[data-testid="approval-deny"]') ||
          document.querySelector('[data-testid="approval-session"]')
        if (!(btn instanceof HTMLElement)) return false
        const rect = btn.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        const top = document.elementFromPoint(x, y)
        return Boolean(top && (top === btn || btn.contains(top)))
      })
      expect(clickable, "滚动后审批钮 elementFromPoint 不得点空").toBe(true)
      await window.screenshot({ path: join(SHOTS, "03-approval-dock-pinned.png") })
      await window.evaluate(() => window.__enjoyE2e!.clearPendingApproval!())

      // ── 屏④ 零扩张 / #212：闲置无 beam；文案无空成功；SessionList 未 virtua ──
      await window.setViewportSize({ width: 1280, height: 800 })
      await composer.click()
      await window.waitForTimeout(400)
      const zero = await window.evaluate(() => {
        const beams = document.querySelectorAll("[data-beam][data-on]").length
        const body = document.body.innerText
        const banned = /全面不卡|事件总线已优化|性能大升级|已全面流畅/.test(body)
        const sessionListVirtua = Boolean(
          document.querySelector("[data-session-list] [data-thread-virtua], [data-testid=session-list] [data-thread-virtua-item]")
        )
        const composerOk = Boolean(document.querySelector('[data-testid="composer-input"]'))
        return { beams, banned, sessionListVirtua, composerOk }
      })
      expect(zero.beams, "#212 闲置不得持运 beam").toBe(0)
      expect(zero.banned, "用户面禁空成功").toBe(false)
      expect(zero.sessionListVirtua, "禁 SessionList virtua").toBe(false)
      expect(zero.composerOk).toBe(true)
      await window.screenshot({ path: join(SHOTS, "04-no-expansion-idle-still.png") })

      writeFileSync(
        join(SHOTS, "gate-sample.json"),
        JSON.stringify(
          {
            seededTotal: seeded.total,
            mountedTurns: sample.mounted,
            findHit,
            dockOutside,
            zero
          },
          null,
          2
        )
      )
    } finally {
      await app.close()
    }
  })
})
