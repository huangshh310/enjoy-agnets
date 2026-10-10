/**
 * 知识库来源：一次点开抽屉；工作区文件打开到行；缺失展开片段；只亮一行。
 */
import { execSync } from "node:child_process"
import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import type { ElectronApplication, Locator, Page } from "playwright"
import { hideOverlays, launchEnjoy, SHOTS, snap } from "./base-p0-1-launch"
import { sendComposer } from "./send-composer"

const THEME_KEY = "boardui:theme"
const THEME_EVENT = "boardui:theme-change"
const FOOTER = "点文件可以在右侧打开；找不到的文件会就地展开片段。"

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

/** 审查栏非 git 只画空态；夹具先建仓，打开文件才走现有 ChangesFileDiff。 */
function initFixtureGit(workspace: string): void {
  execSync("git init -b main", { cwd: workspace })
  execSync("git add readme.md", { cwd: workspace })
  execSync("git -c user.email=e2e@local -c user.name=e2e commit -m init", { cwd: workspace })
}

async function waitSheetReady(window: Page, sheet: Locator): Promise<void> {
  await expect(sheet).toBeVisible({ timeout: 8_000 })
  await expect
    .poll(async () => (await sheet.boundingBox())?.width ?? 0, { timeout: 4_000 })
    .toBeGreaterThan(240)
}

test("一次点开抽屉，知识库行打开文件或展开片段，只亮一行", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-know-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\nhello knowledge\n")
  writeFileSync(join(workspace, "untracked.txt"), "hello knowledge\n")
  initFixtureGit(workspace)
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "hello knowledge")
    await composer.click()
    const untrackedChip = window.locator(
      '[data-testid="turn-source-chip-knowledge"][data-source-path="untracked.txt"]'
    )
    await expect(untrackedChip).toBeVisible({ timeout: 20_000 })
    await untrackedChip.click()
    const sheet = window.locator('[data-testid="turn-sources-sheet"]')
    await waitSheetReady(window, sheet)
    await expect(sheet.getByText("本轮来源")).toBeVisible()
    await expect(sheet.getByText(FOOTER)).toBeVisible()
    const selected = window.locator('[data-testid="turn-source-row"][data-selected="true"]')
    await expect(selected).toHaveCount(1)
    await expect(selected).toHaveAttribute("data-path", "untracked.txt")
    const theme = window.getByRole("button", { name: "深色" })
    await expect(theme).toBeVisible()
    const themeBox = await theme.boundingBox()
    const sheetBox = await sheet.boundingBox()
    expect(themeBox && sheetBox && themeBox.y + themeBox.height <= sheetBox.y + 1).toBeTruthy()
    await snap(window, "knowledge-source-chip")
    await snapSheet(sheet, "knowledge-source-drawer-sheet")

    const readmeRow = window.locator('[data-testid="turn-source-row"][data-path="readme.md"]')
    await expect(readmeRow).toBeVisible()
    await readmeRow.click()
    await expect(sheet).toBeHidden({ timeout: 8_000 })
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getSelectedFile()?.path ?? ""), { timeout: 8_000 })
      .toMatch(/readme\.md$/)
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getSelectedFile()?.line ?? 0), { timeout: 8_000 })
      .toBe(1)
    await expect
      .poll(
        async () => window.evaluate(() => window.__enjoyE2e?.getSelectedFile()?.rightPanelCollapsed ?? true),
        { timeout: 8_000 }
      )
      .toBe(false)
    await expect(window.locator('[data-testid="source-file-path"]')).toContainText("readme.md")
    await expect(window.locator('[data-testid="source-file-view-mode"]')).toContainText("查看文件")
    const preview = window.locator('[data-testid="source-file-preview"]')
    await expect(preview).toBeVisible()
    await expect(preview).not.toContainText("@@")
    await expect(preview).not.toContainText("+")
    await expect(window.locator('[data-testid="source-file-diff"]')).toHaveCount(0)
    await expect(window.locator('[data-source-highlight="true"]')).toBeVisible()
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getSelectedFile()?.view ?? ""), { timeout: 4_000 })
      .toBe("preview")
    await snap(window, "knowledge-source-file-preview")

    writeFileSync(join(workspace, "note.txt"), "changed this turn\n")
    await window.evaluate(() => {
      window.__enjoyE2e?.injectThisTurnWrite("note.txt")
    })
    await window.evaluate(() => {
      window.__enjoyE2e?.injectSheetChip({
        id: "file:note.txt",
        kind: "file",
        label: "note.txt",
        path: "note.txt",
        startLine: 1
      })
    })
    const noteRow = window.locator('[data-testid="turn-source-row"][data-path="note.txt"]')
    await expect(noteRow).toBeVisible()
    await noteRow.click()
    await expect(window.locator('[data-testid="source-file-diff"]')).toBeVisible({ timeout: 8_000 })
    await expect(window.locator('[data-testid="source-file-diff"]')).toContainText("@@")
    await expect(window.locator('[data-testid="source-file-preview"]')).toHaveCount(0)
    await snap(window, "knowledge-source-file-diff")

    const readmeChip = window.locator(
      '[data-testid="turn-source-chip-knowledge"][data-source-path="readme.md"]'
    )
    await readmeChip.click()
    await waitSheetReady(window, sheet)
    await expect(window.locator('[data-testid="turn-source-row"][data-selected="true"]')).toHaveCount(1)
    await window.evaluate(() => {
      window.__enjoyE2e?.injectSheetChip({
        id: "gone.md:1",
        kind: "knowledge",
        label: "gone.md",
        path: "gone.md",
        startLine: 1,
        snippet: "already deleted"
      })
    })
    const goneRow = window.locator('[data-testid="turn-source-row"][data-path="gone.md"]')
    await expect(goneRow).toBeVisible()
    await goneRow.click()
    await expect(sheet).toBeVisible()
    await expect(goneRow).toHaveAttribute("data-expanded", "true")
    await expect(window.locator('[data-testid="turn-source-snippet"]')).toContainText("already deleted")
    await expect(window.locator('[data-testid="renderer-crash-fallback"]')).toHaveCount(0)
    await snap(window, "knowledge-source-drawer")
    await snapSheet(sheet, "knowledge-source-drawer-expand")
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
    await expect(sheet.getByText(FOOTER)).toBeVisible()
    await snap(window, "knowledge-source-drawer-dark")
    await snapSheet(sheet, "knowledge-source-drawer-sheet-dark")
    const darkReadme = window.locator('[data-testid="turn-source-row"][data-path="readme.md"]')
    await darkReadme.click()
    await expect(window.locator('[data-testid="source-file-preview"]')).toBeVisible({ timeout: 8_000 })
    await expect(window.locator('[data-testid="source-file-diff"]')).toHaveCount(0)
    await snap(window, "knowledge-source-file-preview-dark")
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
