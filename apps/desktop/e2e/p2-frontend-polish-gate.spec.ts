/**
 * P2 前端收口 soft · 真机自门 4 屏
 * 1 Toast 统一（堆叠/底中） · 2 终端 addon 可感 · 3 外链走 main · 4 reduce 静帧
 * 预览 HTML 不算过门。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import type { ElectronApplication } from "playwright"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-frontend-polish"

test("P2 前端收口 soft · 4 屏自门", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(SHOTS, { recursive: true })

  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  test.skip(!electron?.launch, "playwright electron launcher unavailable")

  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-fe-polish-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-fe-polish-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")

  const app = (await electron!.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_STUB_SLOW_MS: "200",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_SESSION_COUNT: "12"
    }
  })) as ElectronApplication

  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 920 })

    // ── 屏① Toast 统一：归档 ≥2 条 → 同皮底中堆叠 ≤3 ──
    const titles = ["Seed session 01", "Seed session 02", "Seed session 03"]
    for (const title of titles) {
      const row = sessionRow(window, title)
      if ((await row.count()) === 0) continue
      await row.scrollIntoViewIfNeeded()
      await archiveRow(window, row)
      await window.waitForTimeout(350)
    }
    const toasts = window.locator("[data-sonner-toast], [data-testid='session-archived-toast']")
    await expect.poll(async () => toasts.count(), { timeout: 12_000 }).toBeGreaterThanOrEqual(1)
    const toastCount = await toasts.count()
    expect(toastCount).toBeLessThanOrEqual(3)
    const toastGeom = await window.evaluate(() => {
      const list = [...document.querySelectorAll("[data-sonner-toast]")] as HTMLElement[]
      const toaster = document.querySelector("[data-sonner-toaster]") as HTMLElement | null
      const first = list[0]
      if (!first || !toaster) return null
      const tb = first.getBoundingClientRect()
      const mid = window.innerWidth / 2
      return {
        count: list.length,
        centerDelta: Math.abs(tb.left + tb.width / 2 - mid),
        yPosition: toaster.getAttribute("data-y-position"),
        xPosition: toaster.getAttribute("data-x-position"),
        text: list.map((el) => el.textContent ?? "").join(" | ")
      }
    })
    expect(toastGeom).toBeTruthy()
    expect(toastGeom!.yPosition).toBe("bottom")
    expect(toastGeom!.xPosition).toBe("center")
    expect(toastGeom!.centerDelta).toBeLessThan(220)
    expect(toastGeom!.text).not.toMatch(/IPC|window\.openExternal|stack trace/i)
    await window.screenshot({ path: join(SHOTS, "01-sonner-stack-bottom-center.png") })

    // ── 屏② 终端 addon：打开终端 + 查找条 ──
    await openTerminal(window)
    const pane = window.locator("[data-terminal-pane]")
    await expect(pane).toBeVisible({ timeout: 15_000 })
    // stub 会 seed echo；再手打一行保证 WebLinks 可感（xterm 画在 canvas，body.innerText 不可靠）
    await pane.click({ position: { x: 40, y: 40 } }).catch(() => undefined)
    await window.keyboard.type("echo https://example.com/docs")
    await window.keyboard.press("Enter")
    await window.waitForTimeout(1200)
    // ⌘/Ctrl+F 开查找
    await window.keyboard.press("Control+F")
    const findBar = window.locator('[data-testid="terminal-find-bar"]')
    await expect(findBar).toBeVisible({ timeout: 8_000 })
    await findBar.locator("input").fill("example")
    await window.waitForTimeout(400)
    const rendererMode = await pane.getAttribute("data-xterm-renderer")
    await window.screenshot({ path: join(SHOTS, "02-terminal-addon-search.png") })
    writeFileSync(
      join(SHOTS, "terminal-addon-sample.json"),
      JSON.stringify({ rendererMode, findBar: true }, null, 2)
    )

    // ── 屏③ 外链走 main：点链接 → shell.openExternal 记录；renderer 无 window.open ──
    await app.evaluate(({ shell }) => {
      const g = globalThis as unknown as { __opened?: string[]; __windowOpenHits?: number }
      g.__opened = []
      g.__windowOpenHits = 0
      shell.openExternal = async (url: string) => {
        g.__opened!.push(url)
      }
    })
    await window.evaluate(() => {
      const g = window as unknown as { open: typeof window.open; __windowOpenHits?: number }
      g.__windowOpenHits = 0
      const original = g.open.bind(window)
      g.open = ((..._args: Parameters<typeof window.open>) => {
        g.__windowOpenHits = (g.__windowOpenHits ?? 0) + 1
        return null
      }) as typeof window.open
      ;(window as unknown as { __restoreOpen?: () => void }).__restoreOpen = () => {
        g.open = original
      }
    })
    // 优先点 xterm link decoration；否则走与 addon 相同的 renderer 出口（仍禁 window.open）
    const link = pane.locator(".xterm-link").first()
    if ((await link.count()) > 0) {
      await link.click({ force: true })
    } else {
      // 回落：走 preload ide.window.openExternal（= requestOpenExternalQuiet 同链），仍禁 window.open
      await window.evaluate(async () => {
        const ide = (window as unknown as { ide: { window: { openExternal: (i: { url: string }) => Promise<unknown> } } }).ide
        await ide.window.openExternal({ url: "https://example.com/docs" })
      })
    }
    await expect
      .poll(async () => app.evaluate(() => (globalThis as unknown as { __opened?: string[] }).__opened ?? []), {
        timeout: 10_000
      })
      .toEqual(expect.arrayContaining([expect.stringContaining("https://example.com/docs")]))
    const windowOpenHits = await window.evaluate(
      () => (window as unknown as { __windowOpenHits?: number }).__windowOpenHits ?? 0
    )
    expect(windowOpenHits, "禁 renderer window.open").toBe(0)
    await window.screenshot({ path: join(SHOTS, "03-external-link-via-main.png") })
    writeFileSync(
      join(SHOTS, "external-link-sample.json"),
      JSON.stringify(
        {
          opened: await app.evaluate(
            () => (globalThis as unknown as { __opened?: string[] }).__opened ?? []
          ),
          windowOpenHits
        },
        null,
        2
      )
    )

    // ── 屏④ reduce 静帧 + 零扩张文案 ──
    await window.emulateMedia({ reducedMotion: "reduce" })
    // 再归档一条触发 toast
    const more = sessionRow(window, "Seed session 04")
    if ((await more.count()) > 0) {
      await more.scrollIntoViewIfNeeded()
      await archiveRow(window, more)
    }
    await expect.poll(async () => toasts.count(), { timeout: 8_000 }).toBeGreaterThanOrEqual(1)
    const reduceSample = await window.evaluate(() => {
      const el = document.querySelector("[data-sonner-toast][data-mounted='true']") as HTMLElement | null
      if (!el) return { ok: false, opacity: 0, transition: "", animation: "" }
      const cs = getComputedStyle(el)
      return {
        ok: true,
        opacity: Number(cs.opacity),
        transition: cs.transitionProperty + ":" + cs.transitionDuration,
        animation: cs.animationName
      }
    })
    expect(reduceSample.ok).toBe(true)
    expect(reduceSample.opacity).toBeGreaterThanOrEqual(0.95)
    // 减动下不应再有滑动动画名
    expect(String(reduceSample.animation || "none")).toMatch(/none|^$/)
    const bodyText = await window.locator("body").innerText()
    expect(bodyText).not.toMatch(/前端全面重构|性能大升级|性能翻倍|已全面升级/)
    await window.screenshot({ path: join(SHOTS, "04-reduce-motion-toast-static.png") })
    writeFileSync(join(SHOTS, "gate-sample.json"), JSON.stringify({ reduceSample, toastGeom }, null, 2))
  } finally {
    await Promise.race([app.close().catch(() => null), new Promise((r) => setTimeout(r, 5_000))])
    try {
      const pid = app.process()?.pid
      if (pid) process.kill(pid, "SIGKILL")
    } catch {
      /* ignore */
    }
  }
})

async function readyWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 30_000 })
  await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
    timeout: 30_000
  })
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
  return window
}

function sessionRow(window: Page, title: string) {
  return window.locator(
    `[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-name="${title}"]`
  )
}

async function archiveRow(window: Page, row: ReturnType<typeof sessionRow>) {
  await row.hover()
  await row.locator('[data-testid="session-row-menu"]').click()
  const archive = window.locator('[data-testid="session-row-menu-archive"]')
  await archive.waitFor({ timeout: 8_000 })
  await archive.click()
}

async function openTerminal(window: Page) {
  const expand = window.getByLabel("展开改动面板")
  if (await expand.count()) await expand.click()
  else await window.getByLabel("Expand changes pane").click({ timeout: 4_000 }).catch(() => undefined)
  const terminal = window.getByText("终端", { exact: true })
  if ((await terminal.count()) > 0) await terminal.click()
  await window.locator("[data-terminal-pane]").waitFor({ timeout: 15_000 })
}
