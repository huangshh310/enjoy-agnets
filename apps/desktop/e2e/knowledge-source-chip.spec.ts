/**
 * 知识库来源芯片：点开「本轮来源」抽屉选中该行，渲染进程不崩。
 * stub 启动会索引工作区 `.`（readme.md · hello knowledge）。
 */
import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import type { ElectronApplication, Locator, Page } from "playwright"
import { hideOverlays, launchEnjoy, SHOTS, snap } from "./base-p0-1-launch"
import { sendComposer } from "./send-composer"

const THEME_KEY = "boardui:theme"
const THEME_EVENT = "boardui:theme-change"

/** 写 localStorage 并广播，避免标题栏 ThemeToggle 把 html.dark 扳回去。 */
async function forceTheme(window: Page, theme: "light" | "dark"): Promise<void> {
  await window.evaluate(
    ({ next, key, eventName }) => {
      document.documentElement.classList.toggle("dark", next === "dark")
      document.documentElement.dataset.theme = next
      window.localStorage.setItem(key, next)
      window.dispatchEvent(new CustomEvent(eventName, { detail: next }))
    },
    { next: theme, key: THEME_KEY, eventName: THEME_EVENT }
  )
}

async function snapSheet(sheet: Locator, name: string): Promise<void> {
  await sheet.screenshot({ path: join(SHOTS, `${name}.png`) })
}

/** 根错误边界挂上后 Electron 常收不掉，不能让 close 拖死测试。 */
async function closeApp(app: ElectronApplication): Promise<void> {
  try {
    await Promise.race([
      app.close(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("close timeout")), 4_000)
      })
    ])
  } catch {
    app.process()?.kill("SIGKILL")
  }
}

test("点知识库来源芯片打开本轮来源且选中该行", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-know-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\nhello knowledge\n")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "hello knowledge")
    const chip = window.locator('[data-testid="turn-source-chip-knowledge"]')
    await expect(chip).toBeVisible({ timeout: 20_000 })
    await snap(window, "knowledge-source-chip")
    await chip.click()
    const sheet = window.locator('[data-testid="turn-sources-sheet"]')
    await expect(sheet).toBeVisible({ timeout: 8_000 })
    // md 面 200ms 从右侧滑入；toBeVisible 在第一帧就过，太早拍会只剩右缘一条。
    await expect
      .poll(async () => (await sheet.boundingBox())?.width ?? 0, { timeout: 4_000 })
      .toBeGreaterThan(240)
    await expect(sheet.getByText("本轮来源")).toBeVisible()
    await expect(sheet.getByText("点文件可以在右侧打开。")).toBeVisible()
    const row = window.locator('[data-testid="turn-source-row"][data-kind="knowledge"]')
    await expect(row).toBeVisible()
    await expect(row).toHaveAttribute("data-selected", "true")
    await expect(window.locator('[data-testid="renderer-crash-fallback"]')).toHaveCount(0)
    await expect(window.locator("body")).not.toContainText("Element type is invalid")
    await expect(window.locator("body")).not.toContainText("Something went wrong!")
    await snap(window, "knowledge-source-drawer")
    await snapSheet(sheet, "knowledge-source-drawer-sheet")
    await forceTheme(window, "dark")
    await expect
      .poll(
        async () =>
          window.evaluate(() => {
            const el = document.querySelector("[data-testid='turn-sources-sheet']")
            if (!el || !document.documentElement.classList.contains("dark")) return ""
            return getComputedStyle(el).backgroundColor
          }),
        { timeout: 4_000 }
      )
      .not.toBe("rgb(255, 255, 255)")
    await expect(sheet.getByText("点文件可以在右侧打开。")).toBeVisible()
    await expect(row).toHaveAttribute("data-selected", "true")
    await snap(window, "knowledge-source-drawer-dark")
    await snapSheet(sheet, "knowledge-source-drawer-sheet-dark")
    await forceTheme(window, "light")
    await window.setViewportSize({ width: 1024, height: 700 })
    await expect
      .poll(async () => (await sheet.boundingBox())?.width ?? 0, { timeout: 4_000 })
      .toBeGreaterThan(240)
    const box1024 = await sheet.boundingBox()
    expect(box1024).toBeTruthy()
    expect(box1024!.x + box1024!.width).toBeLessThanOrEqual(1024)
    await snap(window, "knowledge-source-drawer-1024")
  } finally {
    await closeApp(app)
  }
})

test("渲染崩溃回退面是中文短句，不摊英文堆栈", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-crash-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\nhello knowledge\n")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
    await window.evaluate(() => {
      window.__enjoyE2e?.crashRenderer()
    })
    const fallback = window.locator('[data-testid="renderer-crash-fallback"]')
    await expect(fallback).toBeVisible({ timeout: 8_000 })
    await expect(fallback).toContainText("这里出了点问题。")
    await expect(fallback).toContainText("重新加载")
    await expect(fallback).not.toContainText("Element type is invalid")
    await expect(fallback).not.toContainText("Something went wrong!")
    await expect(window.locator('[data-testid="renderer-crash-stack"]')).toHaveCount(0)
    await snap(window, "renderer-crash-fallback")
  } finally {
    await closeApp(app)
  }
})
