/**
 * P2 侧栏会话行归档对齐 soft · 真机自门 4 屏
 * 1 flat 归档 · 2 status 归档 · 3 project 不回归+主流程 · 4 零扩张
 * 预览 HTML 不算过门。归档必须打主进程真实 Seed（禁仅 hydrate 假 id）。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-session-archive-align"

async function launch(env: Record<string, string> = {}) {
  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-session-archive-align-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-session-archive-align-ws-"))
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
      ENJOY_E2E_SESSION_COUNT: "16",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ...env
    }
  })
}

async function waitBridge(window: Page) {
  await expect
    .poll(async () => window.evaluate(() => Boolean(window.__enjoyE2e?.setSidebarGrouping)), {
      timeout: 45_000
    })
    .toBe(true)
}

function treeRowByName(window: Page, name: string) {
  return window.locator(
    `[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-name="${name}"]`
  )
}

async function openArchiveOnNamedRow(window: Page, name: string) {
  const row = treeRowByName(window, name)
  await row.scrollIntoViewIfNeeded()
  await expect(row).toBeVisible({ timeout: 8_000 })
  await row.hover()
  const menuBtn = row.locator('[data-testid="session-row-menu"]')
  await menuBtn.click({ force: true })
  const menu = window.locator('[data-testid="session-row-menu-content"]')
  await expect(menu).toBeVisible({ timeout: 8_000 })
  const archive = window.locator('[data-testid="session-row-menu-archive"]')
  await expect(archive).toBeVisible({ timeout: 5_000 })
  return { archive, menu, row, name }
}

test.describe("P2 session archive align gate", () => {
  test.setTimeout(200_000)

  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
  })

  test("01–04 flat/status 归档对齐 · project 不回归 · 零扩张", async () => {
    test.skip(!existsSync(mainEntry), "out/main missing")
    const app = await launch()
    if (!app) {
      test.skip(true, "electron launcher unavailable")
      return
    }
    const sample: Record<string, unknown> = { at: new Date().toISOString() }
    try {
      const window = await app.firstWindow()
      await window.waitForSelector("#root", { timeout: 30_000 })
      await window.setViewportSize({ width: 1280, height: 800 })
      const composer = window.locator('[data-testid="composer-input"]')
      await composer.waitFor({ timeout: 45_000 })
      await waitBridge(window)

      // ── 屏① flat：Organize→按聊天；行菜单有归档；点后离开 + toast 人话 ──
      await window.evaluate(() => window.__enjoyE2e!.setSidebarGrouping!("flat"))
      await expect
        .poll(
          async () =>
            window.evaluate(() => Boolean(document.querySelector('[data-testid="sidebar-session-virt-flat"]'))),
          { timeout: 10_000 }
        )
        .toBe(true)

      const flatName = "Seed session 05"
      const flatOpen = await openArchiveOnNamedRow(window, flatName)
      const flatVariant = await flatOpen.archive.getAttribute("data-variant")
      expect(flatVariant, "归档项禁 destructive variant").not.toBe("destructive")
      const flatArchiveText = (await flatOpen.archive.innerText()).trim()
      expect(flatArchiveText).toMatch(/归档/)
      await window.screenshot({ path: join(SHOTS, "01-flat-menu-archive.png") })
      await flatOpen.archive.click()
      await expect(treeRowByName(window, flatName)).toHaveCount(0, { timeout: 10_000 })
      const flatToast = window
        .locator('[data-testid="session-archived-toast"]')
        .filter({ hasText: `已归档「${flatName}」` })
      await expect(flatToast).toBeVisible({ timeout: 8_000 })
      await window.screenshot({ path: join(SHOTS, "01b-flat-archived-toast.png") })
      sample.flat = { name: flatName, archiveText: flatArchiveText, variant: flatVariant }

      await window.keyboard.press("Escape")
      await window.waitForTimeout(400)

      // ── 屏② status：Organize→按状态；组内行菜单有归档；同语义 ──
      await window.evaluate(() => window.__enjoyE2e!.setSidebarGrouping!("status"))
      await expect
        .poll(
          async () =>
            window.evaluate(() =>
              Boolean(document.querySelector('[data-testid^="sidebar-session-virt-status-"]'))
            ),
          { timeout: 10_000 }
        )
        .toBe(true)

      const statusName = "Seed session 08"
      const statusOpen = await openArchiveOnNamedRow(window, statusName)
      const statusArchiveText = (await statusOpen.archive.innerText()).trim()
      expect(statusArchiveText).toMatch(/归档/)
      await window.screenshot({ path: join(SHOTS, "02-status-menu-archive.png") })
      await statusOpen.archive.click()
      await expect(treeRowByName(window, statusName)).toHaveCount(0, { timeout: 10_000 })
      const statusToast = window
        .locator('[data-testid="session-archived-toast"]')
        .filter({ hasText: `已归档「${statusName}」` })
      await expect(statusToast).toBeVisible({ timeout: 8_000 })
      await window.screenshot({ path: join(SHOTS, "02b-status-archived-toast.png") })
      sample.status = { name: statusName, archiveText: statusArchiveText }

      await window.keyboard.press("Escape")
      await window.waitForTimeout(300)

      // ── 屏③ project 不回归 + 主流程 ──
      await window.evaluate(() => {
        window.__enjoyE2e!.setSidebarGrouping!("project")
        window.__enjoyE2e!.setRunningForPin!(true)
      })
      await window.waitForTimeout(400)

      const projectName = "Seed session 03"
      const projectOpen = await openArchiveOnNamedRow(window, projectName)
      await expect(projectOpen.archive).toBeVisible()
      const projectArchiveText = (await projectOpen.archive.innerText()).trim()
      expect(projectArchiveText).toMatch(/归档/)
      // 不点归档——只证入口仍在；主流程抽验
      await window.screenshot({ path: join(SHOTS, "03-project-menu-archive-mainflow.png") })
      await window.keyboard.press("Escape")

      // 点选一条验证高亮
      await treeRowByName(window, projectName).click()
      await window.waitForTimeout(150)

      const mainflow = await window.evaluate(() => {
        const composerOk = Boolean(document.querySelector('[data-testid="composer-input"]'))
        const newSession = Boolean(document.querySelector('[data-testid="sidebar-new-session"]'))
        const activePin =
          document.querySelectorAll(
            '[data-testid="sidebar-session-row"][data-session-surface="active"]'
          ).length > 0 ||
          [...document.querySelectorAll("span")].some((el) => /进行中|需处理/.test(el.textContent ?? ""))
        const activeTree = Boolean(
          document.querySelector(
            '[data-testid="sidebar-session-row"][data-session-surface="tree"][data-active="true"]'
          )
        )
        return { composerOk, newSession, activePin, activeTree }
      })
      expect(mainflow.composerOk, "Composer 无死路").toBe(true)
      expect(mainflow.newSession, "新建会话入口").toBe(true)
      expect(mainflow.activePin || mainflow.activeTree, "钉住或高亮至少其一").toBe(true)
      sample.mainflow = mainflow
      sample.project = { name: projectName, archiveText: projectArchiveText }

      // ── 屏④ 零扩张：灌长线程逼出 #213 线程 virtua；seedMany 验侧栏 virtua；禁空成功 ──
      await window.evaluate(() => {
        window.__enjoyE2e!.setRunningForPin!(true)
        window.__enjoyE2e!.seedLongThread!(12)
      })
      await expect
        .poll(
          async () =>
            window.evaluate(() => Boolean(document.querySelector('[data-thread-virtua="true"]'))),
          { timeout: 8_000 }
        )
        .toBe(true)

      await window.evaluate(() => window.__enjoyE2e!.seedManySessions!(20))
      await expect
        .poll(
          async () =>
            window.evaluate(() => Boolean(document.querySelector('[data-session-virtua="true"]'))),
          { timeout: 8_000 }
        )
        .toBe(true)
      await window.evaluate(() => {
        window.__enjoyE2e!.setRunningForPin!(true)
        window.__enjoyE2e!.seedLongThread!(8)
      })
      await window.waitForTimeout(250)

      const zero = await window.evaluate(() => {
        const body = document.body.innerText
        const banned =
          /菜单全面重构|性能大升级|全面对齐升级|全面 virtua|事件总线已优化|侧栏全面重构/.test(body)
        const hasTanstack = Boolean(
          document.querySelector("[data-tanstack-virtual], [data-radix-virtual]")
        )
        const sessionVirt = Boolean(document.querySelector('[data-session-virtua="true"]'))
        const threadVirt = Boolean(document.querySelector('[data-thread-virtua="true"]'))
        const dockInVirt = (() => {
          const dock = document.querySelector('[data-testid="permission-dock"]')
          const virt = document.querySelector('[data-session-virtua="true"]')
          return Boolean(dock && virt && virt.contains(dock))
        })()
        return { banned, hasTanstack, sessionVirt, threadVirt, dockInVirt }
      })
      expect(zero.banned, "用户面禁空成功").toBe(false)
      expect(zero.hasTanstack, "禁 tanstack 双挂痕迹").toBe(false)
      expect(zero.sessionVirt, "#217 侧栏 virtua 不回退").toBe(true)
      expect(zero.threadVirt, "#213 线程 virtua 不回退").toBe(true)
      expect(zero.dockInVirt, "Dock 禁进侧栏虚拟行").toBe(false)
      await window.screenshot({ path: join(SHOTS, "04-no-expansion.png") })
      sample.zero = zero

      writeFileSync(join(SHOTS, "gate-sample.json"), JSON.stringify(sample, null, 2))
    } finally {
      await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 5_000))])
      try {
        app.process()?.kill("SIGKILL")
      } catch {
        /* gone */
      }
    }
  })
})
